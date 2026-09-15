import {
  addDoc, collection, doc, getDoc, onSnapshot, orderBy, query,
  runTransaction, serverTimestamp, updateDoc, where, getDocs,
} from 'firebase/firestore';
import { db } from './firebase';

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
  const game = await addDoc(collection(db, 'games'), { gamePin, quizId, hostId, status: 'lobby', currentQuestion: -1, questionStartedAt: null, questionEndsAt: null, createdAt: serverTimestamp() });
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
  const started = Date.now();
  await updateDoc(doc(db, 'games', gameId), { status: 'question', currentQuestion: questionIndex, questionStartedAt: started, questionEndsAt: started + duration * 1000 });
}

export async function showResults(gameId) { await updateDoc(doc(db, 'games', gameId), { status: 'results' }); }
export async function finishGame(gameId) { await updateDoc(doc(db, 'games', gameId), { status: 'finished' }); }

export async function submitAnswer(gameId, playerId, questionIndex, selectedOption, correctOption, startedAt, endsAt) {
  const playerRef = doc(db, 'games', gameId, 'players', playerId);
  const answerRef = doc(db, 'games', gameId, 'answers', `${playerId}_${questionIndex}`);
  await runTransaction(db, async (transaction) => {
    const [playerSnap, answerSnap] = await Promise.all([transaction.get(playerRef), transaction.get(answerRef)]);
    if (!playerSnap.exists() || answerSnap.exists()) throw new Error('You have already answered.');
    const isCorrect = selectedOption === correctOption;
    const points = isCorrect ? 100 + Math.max(0, Math.round(((endsAt - Date.now()) / Math.max(1, endsAt - startedAt)) * 50)) : 0;
    transaction.set(answerRef, { playerId, questionIndex, selectedOption, isCorrect, points, answeredAt: serverTimestamp() });
    transaction.update(playerRef, { score: (playerSnap.data().score || 0) + points, currentAnswer: selectedOption, answeredAt: serverTimestamp() });
  });
}