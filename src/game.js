import {
  addDoc, collection, doc, getDoc, onSnapshot, orderBy, query,
  runTransaction, serverTimestamp, Timestamp, updateDoc, where, getDocs,
} from 'firebase/firestore';
import { db } from './firebase';

export function timestampToMillis(value) {
  if (!value) return null;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value < 100000000000 ? value * 1000 : value;
  if (typeof value.seconds === 'number') return value.seconds * 1000 + (value.nanoseconds || 0) / 1000000;
  return null;
}

export const subscribeToQuiz = (id, callback) => onSnapshot(doc(db, 'quizzes', id), (snap) => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null));
export const subscribeToGame = (id, callback) => onSnapshot(doc(db, 'games', id), (snap) => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null));
export const subscribeToPlayers = (id, callback) => onSnapshot(query(collection(db, 'games', id, 'players'), orderBy('joinedAt')), (snap) => callback(snap.docs.map((item) => ({ id: item.id, ...item.data() }))));
export const subscribeToAnswers = (id, questionIndex, callback) => onSnapshot(query(collection(db, 'games', id, 'answers'), where('questionIndex', '==', questionIndex)), (snap) => callback(snap.docs.map((item) => ({ id: item.id, ...item.data() }))));
export const listQuizzes = (hostId, callback) => onSnapshot(query(collection(db, 'quizzes'), where('hostId', '==', hostId)), (snap) => callback(snap.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))));

export async function saveQuiz(hostId, quiz, id) {
  if (!db) throw new Error('Firestore is not initialized. Check the Vercel Firebase environment variables.');
  if (!hostId) throw new Error('A signed-in host is required to save a quiz.');
  const questions = quiz.questions.map((question) => ({ ...question, text: question.text.trim(), options: question.options.map((option) => option.trim()) }));
  const payload = { title: quiz.title.trim(), hostId, questions, updatedAt: serverTimestamp() };
  if (id) { await updateDoc(doc(db, 'quizzes', id), payload); return id; }
  return (await addDoc(collection(db, 'quizzes'), { ...payload, createdAt: serverTimestamp() })).id;
}

export async function createGame(hostId, quizId, gamePin) {
  const quizSnap = await getDoc(doc(db, 'quizzes', quizId));
  if (!quizSnap.exists()) throw new Error('Quiz not found.');
  const quiz = quizSnap.data();
  const playerQuestions = (quiz.questions || []).map(({ text, options, timer }) => ({ text, options, timer }));
  const game = await addDoc(collection(db, 'games'), {
    gamePin,
    quizId,
    quizTitle: quiz.title,
    playerQuestions,
    hostId,
    status: 'lobby',
    currentQuestion: -1,
    questionStartedAt: null,
    questionEndsAt: null,
    revealedQuestionIndex: null,
    revealedCorrectOption: null,
    revealedCorrectCount: 0,
    revealedIncorrectCount: 0,
    createdAt: serverTimestamp(),
  });
  return game.id;
}

export async function joinGame(game, nickname) {
  const playerId = crypto.randomUUID();
  const playerRef = doc(db, 'games', game.id, 'players', playerId);
  const players = await getDocs(collection(db, 'games', game.id, 'players'));
  if (players.docs.some((item) => item.data().nickname.toLowerCase() === nickname.trim().toLowerCase())) throw new Error('That nickname is already taken.');
  await runTransaction(db, async (transaction) => {
    const gameSnap = await transaction.get(doc(db, 'games', game.id));
    if (!gameSnap.exists() || gameSnap.data().status !== 'lobby') throw new Error('This game has already started.');
    transaction.set(playerRef, { nickname: nickname.trim(), score: 0, joinedAt: serverTimestamp(), currentAnswer: null, answeredAt: null });
  });
  return playerId;
}

export async function startQuestion(gameId, questionIndex, duration) {
  const seconds = Math.max(1, Number(duration) || 20);
  const startedAt = Timestamp.now();
  await updateDoc(doc(db, 'games', gameId), {
    status: 'question',
    currentQuestion: questionIndex,
    questionStartedAt: startedAt,
    questionEndsAt: Timestamp.fromMillis(startedAt.toMillis() + seconds * 1000),
    revealedQuestionIndex: null,
    revealedCorrectOption: null,
    revealedCorrectCount: 0,
    revealedIncorrectCount: 0,
    updatedAt: serverTimestamp(),
  });
}

export async function showResults(gameId) { await updateDoc(doc(db, 'games', gameId), { status: 'results' }); }
export async function finishGame(gameId) { await updateDoc(doc(db, 'games', gameId), { status: 'finished' }); }

export async function submitAnswer(gameId, playerId, questionIndex, selectedOption) {
  const playerRef = doc(db, 'games', gameId, 'players', playerId);
  const answerRef = doc(db, 'games', gameId, 'answers', `${playerId}_${questionIndex}`);
  await runTransaction(db, async (transaction) => {
    const [gameSnap, playerSnap, answerSnap] = await Promise.all([
      transaction.get(doc(db, 'games', gameId)),
      transaction.get(playerRef),
      transaction.get(answerRef),
    ]);
    const gameData = gameSnap.data();
    const questionEndsAt = gameSnap.exists() ? timestampToMillis(gameData.questionEndsAt) : null;
    if (!gameSnap.exists() || gameData.status !== 'question' || gameData.currentQuestion !== questionIndex || !questionEndsAt || questionEndsAt <= Date.now()) {
      throw new Error('Question time has expired.');
    }
    if (!playerSnap.exists() || answerSnap.exists()) throw new Error('You have already answered.');
    transaction.set(answerRef, { playerId, questionIndex, selectedOption, answeredAt: serverTimestamp(), points: 0, correct: null });
    transaction.update(playerRef, { currentAnswer: selectedOption, answeredAt: serverTimestamp() });
  });
}

export async function revealAnswer(gameId, questionIndex, correctOption) {
  const gameRef = doc(db, 'games', gameId);
  const answerQuery = query(collection(db, 'games', gameId, 'answers'), where('questionIndex', '==', questionIndex));
  const playerQuery = collection(db, 'games', gameId, 'players');
  await runTransaction(db, async (transaction) => {
    const [gameSnap, answerSnap, playerSnap] = await Promise.all([
      transaction.get(gameRef),
      transaction.get(answerQuery),
      transaction.get(playerQuery),
    ]);
    if (!gameSnap.exists()) throw new Error('Game not found.');
    const game = gameSnap.data();
    if (game.revealedQuestionIndex === questionIndex) return;
    if (game.currentQuestion !== questionIndex) throw new Error('That question is no longer active.');

    const playersById = new Map(playerSnap.docs.map((item) => [item.id, item]));
    const startedMillis = timestampToMillis(game.questionStartedAt);
    const endsMillis = timestampToMillis(game.questionEndsAt);
    let correctCount = 0;
    let answeredCount = 0;
    answerSnap.docs.forEach((answerDoc) => {
      const answer = answerDoc.data();
      const isCorrect = answer.selectedOption === correctOption;
      if (isCorrect) correctCount += 1;
      answeredCount += 1;
      const answeredMillis = timestampToMillis(answer.answeredAt);
      const remainingTime = startedMillis && endsMillis && answeredMillis
        ? Math.max(0, Math.min(endsMillis - startedMillis, endsMillis - answeredMillis))
        : 0;
      const totalTime = Math.max(1, (endsMillis || 0) - (startedMillis || 0));
      const points = isCorrect && remainingTime > 0
        ? Math.max(5, Math.min(20, Math.round(20 * (remainingTime / totalTime))))
        : 0;
      transaction.update(answerDoc.ref, { correct: isCorrect, points, resolvedAt: serverTimestamp() });
      const playerDoc = playersById.get(answer.playerId);
      if (playerDoc) {
        transaction.update(playerDoc.ref, {
          score: (playerDoc.data().score || 0) + points,
          lastQuestionIndex: questionIndex,
          lastCorrect: isCorrect,
          lastPoints: points,
        });
      }
    });
    transaction.update(gameRef, {
      status: 'results',
      revealedQuestionIndex: questionIndex,
      revealedCorrectOption: correctOption,
      revealedCorrectCount: correctCount,
      revealedIncorrectCount: answeredCount - correctCount,
      revealedAt: serverTimestamp(),
    });
  });
}