import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, db, firebaseError, firebaseMissingVariables } from "./firebase";
import {
  createGame,
  finishGame,
  joinGame,
  listQuizzes,
  revealAnswer,
  saveQuiz,
  showResults,
  startQuestion,
  subscribeToAnswers,
  subscribeToGame,
  subscribeToPlayers,
  subscribeToQuiz,
  submitAnswer,
  timestampToMillis,
} from "./game";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  CircleUserRound,
  Copy,
  LogOut,
  Plus,
  Radio,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import "./styles.css";

const colors = ["coral", "gold", "teal", "violet"];
const PLAYER_ROUTE = "/play";
const PRODUCTION_ORIGIN = "https://live-quiz.vercel.app";
const blankQuestion = () => ({
  text: "",
  options: ["", "", "", ""],
  correct: 0,
  timer: 20,
});
const makePin = () => String(Math.floor(100000 + Math.random() * 900000));

function App() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const handler = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);
  const go = (to) => {
    window.history.pushState({}, "", to);
    setPath(to);
  };
  const [user, setUser] = useState(undefined);
  useEffect(() => {
    if (!auth) return undefined;
    return onAuthStateChanged(auth, setUser);
  }, []);
  if (path === "/host" || path.startsWith("/host/"))
    return <HostApp user={user} go={go} />;
  if ((path === PLAYER_ROUTE || path.startsWith(`${PLAYER_ROUTE}/`)) && (firebaseError || !db))
    return <FirebaseUnavailable go={go} />;
  if (path === PLAYER_ROUTE || path.startsWith(`${PLAYER_ROUTE}/`))
    return <PlayerApp go={go} />;
  return <Home go={go} />;
}

class AppErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("Pulse Quiz failed to render.", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="shell">
        <section className="auth-panel">
          <p className="kicker">PULSE QUIZ ERROR</p>
          <h1>We could not load this page.</h1>
          <p>
            Refresh the page and try again. If the problem continues, return to
            the home page and open the player join page again.
          </p>
          <button className="primary full" onClick={() => window.location.reload()}>
            Reload Pulse Quiz <ArrowRight size={18} />
          </button>
        </section>
      </main>
    );
  }
}

function FirebaseUnavailable({ go }) {
  const message = firebaseMissingVariables.length
    ? `Missing Firebase environment variables: ${firebaseMissingVariables.join(", ")}`
    : "Firebase initialization failed. Check the browser console for the error code.";
  return (
    <Shell go={go}>
      <section className="auth-panel">
        <p className="kicker">SETUP REQUIRED</p>
        <h1>Firebase is not connected.</h1>
        <p>
          {message} The home page is available, but live rooms need Firebase
          configured in Vercel.
        </p>
      </section>
    </Shell>
  );
}
function Shell({ children, go, eyebrow = "PULSE QUIZ" }) {
  return (
    <main className="shell">
      <header className="topbar">
        <button className="brand" onClick={() => go("/")}>
          <span className="brand-mark">
            <Sparkles size={17} />
          </span>
          {eyebrow}
        </button>
        <span className="live-dot">LIVE PLAY</span>
      </header>
      {children}
    </main>
  );
}
function Home({ go }) {
  return (
    <Shell go={go}>
      <section className="home">
        <div className="home-copy">
          <div className="event-branding" aria-label="Pharmacist Day 2026 event">
            <span className="event-organization">SRI RAMAKRISHNA HOSPITAL</span>
            <h2>PHARMACIST DAY 2026</h2>
            <span className="event-department">
              Department of Clinical Pharmacy and Pharmacy
            </span>
          </div>
          <p className="kicker">REAL-TIME TRIVIA / 01</p>
          <h1>
            Make every answer
            <br />
            <em>count.</em>
          </h1>
          <p className="lead">
            A fast, friendly quiz room for curious teams. Join a live game or
            host your own in seconds.
          </p>
          <div className="home-actions">
            <button className="primary" onClick={() => go("/play")}>
              Join a game <ArrowRight size={18} />
            </button>
            <button className="secondary" onClick={() => go("/host")}>
              Host login
            </button>
          </div>
        </div>
        <div className="home-art">
          <div className="art-ring ring-one" />
          <div className="art-ring ring-two" />
          <div className="score-card">
            <span>
              YOUR
              <br />
              SCORE
            </span>
            <strong>+250</strong>
            <small>ON FIRE</small>
          </div>
          <div className="float-card float-a">
            <Trophy size={18} /> 1st place
          </div>
          <div className="float-card float-b">
            <Users size={18} /> 12 players
          </div>
        </div>
      </section>
      <footer className="home-footer">
        <span>Built for bright minds</span>
        <span>● &nbsp; Questions sync instantly</span>
      </footer>
    </Shell>
  );
}

function HostApp({ user, go }) {
  if (firebaseError || !auth) return <FirebaseUnavailable go={go} />;
  return (
    <Shell go={go} eyebrow="PULSE QUIZ / HOST">
      {user === undefined ? (
        <div className="loading">Connecting to Firebase...</div>
      ) : user ? (
        <HostDashboard user={user} go={go} />
      ) : (
        <Login />
      )}
    </Shell>
  );
}
function Login() {
  const [error, setError] = useState("");
  const submit = async () => {
    setError("");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      console.error("Firebase Google sign-in failed.", err);
      setError(
        `${err.code || "auth/unknown"}: ${err.message || "Could not sign in with Google."}`,
      );
    }
  };
  return (
    <section className="auth-panel">
      <p className="kicker">HOST ACCESS</p>
      <h1>Welcome back.</h1>
      <p>Sign in to build a quiz and take the room live.</p>
      {error && <div className="error">{error}</div>}
      <button className="primary full" onClick={submit}>
        Continue with Google <ArrowRight size={18} />
      </button>
    </section>
  );
}

function HostDashboard({ user, go }) {
  const [quizzes, setQuizzes] = useState([]);
  const [editing, setEditing] = useState(null);
  const [game, setGame] = useState(null);
  useEffect(() => listQuizzes(user.uid, setQuizzes), [user.uid]);
  if (editing)
    return (
      <QuizEditor
        user={user}
        quiz={editing === "new" ? null : editing}
        onDone={() => setEditing(null)}
      />
    );
  if (game)
    return (
      <HostGame
        gameId={game}
        onBack={() => {
          setGame(null);
          go("/host");
        }}
      />
    );
  return (
    <section className="dashboard">
      <div className="dash-head">
        <div>
          <p className="kicker">HOST DASHBOARD</p>
          <h1>Your quiz library</h1>
        </div>
        <button
          className="icon-button"
          title="Sign out"
          onClick={() => signOut(auth)}
        >
          <LogOut size={18} />
        </button>
      </div>
      <div className="toolbar">
        <span>
          {quizzes.length} {quizzes.length === 1 ? "quiz" : "quizzes"}
        </span>
        <button className="primary small" onClick={() => setEditing("new")}>
          <Plus size={17} /> Create quiz
        </button>
      </div>
      {quizzes.length ? (
        <div className="quiz-list">
          {quizzes.map((quiz) => (
            <article className="quiz-row" key={quiz.id}>
              <div>
                <span className="quiz-tag">QUIZ</span>
                <h3>{quiz.title}</h3>
                <p>{quiz.questions?.length || 0} questions</p>
              </div>
              <div className="row-actions">
                <button
                  className="secondary small"
                  onClick={() => setEditing(quiz)}
                >
                  Edit
                </button>
                <button
                  className="primary small"
                  onClick={async () =>
                    setGame(await createGame(user.uid, quiz.id, makePin()))
                  }
                >
                  Start live game <Radio size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty">
          <Sparkles size={24} />
          <h2>Your first room is waiting.</h2>
          <p>
            Build a few questions, then invite your players with one simple game
            PIN.
          </p>
          <button className="secondary" onClick={() => setEditing("new")}>
            Create a quiz
          </button>
        </div>
      )}
    </section>
  );
}

function QuizEditor({ user, quiz, onDone }) {
  const [title, setTitle] = useState(quiz?.title || "");
  const [questions, setQuestions] = useState(
    quiz?.questions || [blankQuestion()],
  );
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const update = (index, patch) =>
    setQuestions((items) =>
      items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  const save = async () => {
    if (saveState === "saving") return;
    setError("");
    if (!user?.uid) return setError("You must be signed in to save a quiz.");
    if (
      !title.trim() ||
      questions.some(
        (q) =>
          !q.text?.trim() ||
          !Array.isArray(q.options) ||
          q.options.some((o) => !o?.trim()),
      )
    )
      return setError("Add a title and complete every question and option.");
    setSaveState("saving");
    try {
      await saveQuiz(user.uid, { title, questions }, quiz?.id);
      setSaveState("saved");
      window.setTimeout(onDone, 700);
    } catch (err) {
      console.error("Quiz save failed.", err);
      setSaveState("idle");
      setError(
        `${err.code || "save-failed"}: ${err.message || "The quiz could not be saved. Check your Firebase permissions and try again."}`,
      );
    }
  };
  const saveLabel =
    saveState === "saving"
      ? "Saving..."
      : saveState === "saved"
        ? "Saved successfully"
        : "Save quiz";
  return (
    <section className="editor">
      <button className="back" onClick={onDone}>
        <ChevronLeft size={17} /> Back to library
      </button>
      <div className="editor-head">
        <div>
          <p className="kicker">QUIZ BUILDER</p>
          <h1>Shape the room.</h1>
        </div>
        <button
          className="primary"
          onClick={save}
          disabled={saveState !== "idle"}
        >
          {saveLabel}{" "}
          {saveState === "saved" ? (
            <Check size={17} />
          ) : saveState === "idle" ? (
            <Check size={17} />
          ) : null}
        </button>
      </div>
      <label className="title-field">
        Quiz title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. The big summer quiz"
        />
      </label>
      <div className="question-stack">
        {questions.map((question, index) => (
          <div className="question-card" key={index}>
            <div className="question-card-head">
              <span className="number">0{index + 1}</span>
              <button
                className="delete"
                title="Remove question"
                onClick={() =>
                  setQuestions((items) => items.filter((_, i) => i !== index))
                }
              >
                <X size={17} />
              </button>
            </div>
            <input
              className="question-input"
              value={question.text}
              onChange={(e) => update(index, { text: e.target.value })}
              placeholder="Write your question..."
            />
            <div className="option-grid">
              {question.options.map((option, optionIndex) => (
                <label
                  className={`option-input ${colors[optionIndex]}`}
                  key={optionIndex}
                >
                  <span>{String.fromCharCode(65 + optionIndex)}</span>
                  <input
                    value={option}
                    onChange={(e) =>
                      update(index, {
                        options: question.options.map((o, i) =>
                          i === optionIndex ? e.target.value : o,
                        ),
                      })
                    }
                    placeholder={`Answer ${optionIndex + 1}`}
                  />
                  <input
                    className="radio"
                    type="radio"
                    name={`correct-${index}`}
                    checked={question.correct === optionIndex}
                    onChange={() => update(index, { correct: optionIndex })}
                  />
                </label>
              ))}
            </div>
            <label className="timer">
              Seconds{" "}
              <input
                type="number"
                min="5"
                max="120"
                value={question.timer}
                onChange={(e) =>
                  update(index, { timer: Number(e.target.value) })
                }
              />
            </label>
          </div>
        ))}
      </div>
      {error && <div className="error">{error}</div>}
      <button
        className="add-question"
        onClick={() => setQuestions((items) => [...items, blankQuestion()])}
      >
        <Plus size={17} /> Add question
      </button>
    </section>
  );
}

function HostGameLegacy({ gameId, go }) {
  const [game, setGame] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [players, setPlayers] = useState([]);
  const [answers, setAnswers] = useState([]);
  useEffect(() => subscribeToGame(gameId, setGame), [gameId]);
  useEffect(() => subscribeToPlayers(gameId, setPlayers), [gameId]);
  useEffect(() => {
    if (game?.quizId) return subscribeToQuiz(game.quizId, setQuiz);
  }, [game?.quizId]);
  useEffect(() => {
    if (game && game.currentQuestion >= 0)
      return subscribeToAnswers(gameId, game.currentQuestion, setAnswers);
    setAnswers([]);
  }, [gameId, game?.currentQuestion]);
  if (!game || !quiz)
    return <div className="loading">Loading live room...</div>;
  const question = quiz.questions[game.currentQuestion];
  const begin = () =>
    startQuestion(
      gameId,
      game.currentQuestion < 0 ? 0 : game.currentQuestion + 1,
      quiz.questions[game.currentQuestion < 0 ? 0 : game.currentQuestion + 1]
        ?.timer || 20,
    );
  const isLast = game.currentQuestion >= quiz.questions.length - 1;
    const playerUrl = new URL(PLAYER_ROUTE, PRODUCTION_ORIGIN);
    playerUrl.searchParams.set("pin", game.gamePin);
  return (
    <section className="host-game">
      <div className="live-head">
        <div>
          <p className="kicker">LIVE ROOM / {game.status.toUpperCase()}</p>
          <h1>{quiz.title}</h1>
        </div>
        <div className="live-invite">
          <div className="pin">
            <span>GAME PIN</span>
            <strong>{game.gamePin}</strong>
            <button
              title="Copy game PIN"
              onClick={() => navigator.clipboard?.writeText(game.gamePin)}
            >
              <Copy size={16} />
            </button>
          </div>
          <div className="qr-invite">
            <QRCodeSVG
              value={playerUrl.toString()}
              size={144}
              marginSize={4}
              bgColor="#ffffff"
              fgColor="#171719"
              title={`Scan to join game ${game.gamePin}`}
            />
            <span>Scan to join</span>
            <small>Scan with your phone camera</small>
          </div>
        </div>
      </div>
      {game.status === "lobby" && (
        <div className="lobby">
          <div className="lobby-message">
            <Radio size={26} />
            <h2>Waiting for your players</h2>
            <p>Share the PIN and watch the room fill up.</p>
          </div>
          <PlayerPills players={players} />
        </div>
      )}
      {game.status !== "lobby" && (
        <div className="host-question">
          <div className="question-prompt">
            <span>
              QUESTION {game.currentQuestion + 1} / {quiz.questions.length}
            </span>
            <h2>{question?.text}</h2>
          </div>
          <div className="answer-stats">
            {question?.options.map((option, index) => (
              <div className={`stat ${colors[index]}`} key={option}>
                <b>{String.fromCharCode(65 + index)}</b>
                <span>{option}</span>
                <strong>
                  {
                    answers.filter((answer) => answer.selectedOption === index)
                      .length
                  }
                </strong>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="host-controls">
        {game.status === "lobby" && (
          <button
            className="primary"
            disabled={!players.length}
            onClick={begin}
          >
            Start question <ArrowRight size={18} />
          </button>
        )}
        {game.status === "question" && (
          <button className="primary" onClick={() => showResults(gameId)}>
            Reveal results <Trophy size={17} />
          </button>
        )}
        {game.status === "results" && (
          <>
            <Leaderboard players={players} />
            <button
              className="primary"
              onClick={isLast ? () => finishGame(gameId) : begin}
            >
              {isLast ? "Finish game" : "Next question"}{" "}
              <ArrowRight size={17} />
            </button>
          </>
        )}
        {game.status === "finished" && (
          <>
            <Leaderboard players={players} />
            <button className="secondary" onClick={() => go("/host")}>
              Back to dashboard
            </button>
          </>
        )}
      </div>
    </section>
  );
}
function HostGame({ gameId, onBack }) {
  const [game, setGame] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [players, setPlayers] = useState([]);
  const [answers, setAnswers] = useState([]);
  useEffect(() => subscribeToGame(gameId, setGame), [gameId]);
  useEffect(() => subscribeToPlayers(gameId, setPlayers), [gameId]);
  useEffect(() => {
    if (game?.quizId) return subscribeToQuiz(game.quizId, setQuiz);
  }, [game?.quizId]);
  useEffect(() => {
    if (game && game.currentQuestion >= 0)
      return subscribeToAnswers(gameId, game.currentQuestion, setAnswers);
    setAnswers([]);
  }, [gameId, game?.currentQuestion]);
  useEffect(() => {
    if (game?.status !== "question" || !game.questionEndsAt) return undefined;
    const endsAt = timestampToMillis(game.questionEndsAt);
    if (!endsAt) return undefined;
    const remaining = Math.max(0, endsAt - Date.now());
    const timer = setTimeout(() => showResults(gameId), remaining);
    return () => clearTimeout(timer);
  }, [game?.status, game?.questionEndsAt, gameId]);
  if (!game || !quiz)
    return <div className="loading">Loading live room...</div>;
  const question = quiz.questions[game.currentQuestion];
  const begin = () =>
    startQuestion(
      gameId,
      game.currentQuestion < 0 ? 0 : game.currentQuestion + 1,
      quiz.questions[game.currentQuestion < 0 ? 0 : game.currentQuestion + 1]
        ?.timer || 20,
    );
  const isLast = game.currentQuestion >= quiz.questions.length - 1;
  const playerUrl = new URL(PLAYER_ROUTE, PRODUCTION_ORIGIN);
  playerUrl.searchParams.set("pin", game.gamePin);
  return (
    <section className="host-game">
      <div className="live-head">
        <div>
          <p className="kicker">LIVE ROOM / {game.status.toUpperCase()}</p>
          <h1>{quiz.title}</h1>
        </div>
      </div>
      {game.status === "lobby" && (
        <div className="lobby">
          <div className="lobby-qr">
            <QRCodeSVG
              value={playerUrl.toString()}
              size={240}
              marginSize={4}
              bgColor="#ffffff"
              fgColor="#171719"
              title={`Scan to join game ${game.gamePin}`}
            />
            <strong>SCAN TO JOIN</strong>
            <span>Scan with your phone camera</span>
          </div>
          <div className="lobby-message">
            <Radio size={26} />
            <h2>Waiting for your players</h2>
            <p>Share the PIN and watch the room fill up.</p>
          </div>
          <PlayerPills players={players} />
        </div>
      )}
      {game.status !== "lobby" && (
        <div className="host-question">
          <div className="question-prompt">
            <span>
              QUESTION {game.currentQuestion + 1} / {quiz.questions.length}
            </span>
            <h2>{question?.text}</h2>
          </div>
          <div className="answer-stats">
            {question?.options.map((option, index) => {
              const count = answers.filter((answer) => answer.selectedOption === index).length;
              const revealed = game.revealedQuestionIndex === game.currentQuestion;
              return (
              <div className={`stat ${colors[index]} ${revealed && question.correct === index ? "correct" : ""}`} key={option}>
                <b>{String.fromCharCode(65 + index)}</b>
                <span>{option}</span>
                <strong>{count}</strong>
                {revealed && question.correct === index && <small>✓ CORRECT</small>}
              </div>
              );
            })}
          </div>
          <div className="answer-summary">
            <span>Total answered: <strong>{answers.length} / {players.length}</strong></span>
            {game.revealedQuestionIndex === game.currentQuestion && (
              <span>Correct: <strong>{game.revealedCorrectCount || 0}</strong> &nbsp; Incorrect: <strong>{game.revealedIncorrectCount || 0}</strong></span>
            )}
          </div>
        </div>
      )}
      <div className="host-controls">
        {game.status === "lobby" && (
          <button
            className="primary"
            disabled={!players.length}
            onClick={begin}
          >
            Start question <ArrowRight size={18} />
          </button>
        )}
        {game.status === "question" && (
          <button className="primary" onClick={() => revealAnswer(gameId, game.currentQuestion, question.correct)}>
            Reveal answer <Trophy size={17} />
          </button>
        )}
        {game.status === "results" && (
          <>
            <Leaderboard players={players} />
            {game.revealedQuestionIndex !== game.currentQuestion ? (
              <button className="primary" onClick={() => revealAnswer(gameId, game.currentQuestion, question.correct)}>
                Reveal answer <Trophy size={17} />
              </button>
            ) : (
              <button className="primary" onClick={isLast ? () => finishGame(gameId) : begin}>
                {isLast ? "Finish game" : "Next question"} <ArrowRight size={17} />
              </button>
            )}
          </>
        )}
        {game.status === "finished" && (
          <>
            <Leaderboard players={players} />
            <button type="button" className="secondary" onClick={onBack}>
              Back to dashboard
            </button>
          </>
        )}
      </div>
    </section>
  );
}
function PlayerPills({ players }) {
  return (
    <div className="player-pills">
      {players.map((player) => (
        <span key={player.id}>
          <CircleUserRound size={16} />
          {player.nickname}
        </span>
      ))}
      {!players.length && <span className="muted">No players yet</span>}
    </div>
  );
}
function Leaderboard({ players }) {
  return (
    <div className="leaderboard">
      <span className="kicker">CURRENT LEADERBOARD</span>
      {[...players]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((player, index) => (
          <div key={player.id}>
            <b>{index + 1}</b>
            <span>{player.nickname}</span>
            <strong>{player.score || 0}</strong>
          </div>
        ))}
    </div>
  );
}

function PlayerApp({ go }) {
  const [game, setGame] = useState(null);
  const [gameLoadError, setGameLoadError] = useState("");
  const [playerId, setPlayerId] = useState(() => safeStorage.get("playerId"));
  const [gameId, setGameId] = useState(() => safeStorage.get("gameId"));
  const [nickname, setNickname] = useState(
    () => safeStorage.get("nickname") || "",
  );
  const [pin, setPin] = useState(
    () =>
      new URLSearchParams(window.location.search)
        .get("pin")
        ?.replace(/\D/g, "")
        .slice(0, 6) || "",
  );
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [players, setPlayers] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const leaveStaleSession = () => {
    safeStorage.clear("gameId", "playerId", "nickname");
    setGameId(null);
    setPlayerId(null);
    setGame(null);
    setGameLoadError("");
  };
  useEffect(() => {
    if (!gameId) return undefined;
    setGameLoadError("");
    // If the room can't be reached at all (network down, listener blocked by
    // the network, etc.) show a real error instead of spinning forever.
    const timeout = window.setTimeout(() => {
      setGameLoadError((current) =>
        current ||
        "This is taking longer than expected. Check your connection, or the game may have ended.",
      );
    }, 12000);
    const unsubscribe = subscribeToGame(
      gameId,
      (value) => {
        window.clearTimeout(timeout);
        setGameLoadError("");
        setGame(value);
      },
      (err) => {
        window.clearTimeout(timeout);
        console.error("Game listener failed.", err);
        setGameLoadError(
          err.code === "permission-denied"
            ? "Could not access this room (permission denied)."
            : "Lost connection to the quiz server.",
        );
      },
    );
    return () => {
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, [gameId]);
  useEffect(() => {
    if (gameId) return subscribeToPlayers(gameId, setPlayers, (err) => console.error("Players listener failed.", err));
  }, [gameId]);
  useEffect(() => {
    if (!game?.playerQuestions) {
      setQuiz(null);
      return;
    }
    setQuiz({ title: game.quizTitle, questions: game.playerQuestions });
  }, [game?.playerQuestions, game?.quizTitle]);
  if (!gameId)
    return (
      <JoinForm
        pin={pin}
        setPin={setPin}
        nickname={nickname}
        setNickname={setNickname}
        error={error}
        joining={joining}
        onJoin={async (event) => {
          event.preventDefault();
          setError("");
          if (!/^\d{6}$/.test(pin)) {
            setError("Enter a valid Game PIN to join.");
            return;
          }
          if (!nickname.trim()) {
            setError("Enter a nickname to join.");
            return;
          }
          setJoining(true);
          try {
            const found = await findGame(pin);
            const id = await joinGame(found, nickname);
            safeStorage.set("gameId", found.id);
            safeStorage.set("playerId", id);
            safeStorage.set("nickname", nickname.trim());
            setGameId(found.id);
            setPlayerId(id);
          } catch (err) {
            console.error("Join failed.", err);
            setError(err.message || "Could not join this game.");
          } finally {
            setJoining(false);
          }
        }}
        go={go}
      />
    );
  if (gameLoadError)
    return (
      <Shell go={go}>
        <section className="auth-panel">
          <p className="kicker">CONNECTION PROBLEM</p>
          <h1>We couldn't load this room.</h1>
          <p>{gameLoadError}</p>
          <button className="primary full" onClick={leaveStaleSession}>
            Back to join screen <ArrowRight size={18} />
          </button>
        </section>
      </Shell>
    );
  if (!game || !quiz)
    return (
      <Shell go={go}>
        <div className="loading">Rejoining room...</div>
      </Shell>
    );
  const question = quiz.questions[game.currentQuestion];
  return (
    <Shell go={go} eyebrow="PULSE QUIZ / PLAYER">
      <section className="player-view">
        <div className="player-top">
          <span className="kicker">{quiz.title}</span>
          <span className="player-score">
            {players.find((p) => p.id === playerId)?.score || 0} pts
          </span>
        </div>
        {game.status === "lobby" && (
          <div className="waiting">
            <div className="waiting-orbit">
              <Users size={30} />
            </div>
            <p className="kicker">YOU ARE IN</p>
            <h1>Hang tight, {nickname}.</h1>
            <p>The host will start the first question soon.</p>
            <ScoringInfo />
            <PlayerPills players={players} />
          </div>
        )}
        {game.status === "question" && (
          <PlayerQuestion
            game={game}
            question={question}
            gameId={gameId}
            playerId={playerId}
          />
        )}
        {game.status === "results" && (
          <ResultView
            game={game}
            question={question}
            players={players}
            playerId={playerId}
          />
        )}
        {game.status === "finished" && (
          <ResultView
            game={game}
            question={question}
            players={players}
            playerId={playerId}
            finished
          />
        )}
      </section>
    </Shell>
  );
}
async function findGame(pin) {
  const { collection, getDocs, query, where } =
    await import("firebase/firestore");
  let snap;
  try {
    snap = await getDocs(
      query(
        collection((await import("./firebase")).db, "games"),
        where("gamePin", "==", pin.trim()),
      ),
    );
  } catch (err) {
    console.error("Looking up the game PIN failed.", err);
    throw new Error(
      err.code === "permission-denied"
        ? "Could not look up that PIN (permission denied). Ask the host to check Firestore access."
        : "Could not reach the quiz server. Check your connection and try again.",
    );
  }
  if (snap.empty) throw new Error("No live game found with that PIN.");
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

// Wrap sessionStorage access: some mobile in-app browsers (and private
// browsing modes) throw when storage is accessed at all. Without this guard
// that throw happens during render and can leave the page blank.
const safeStorage = {
  get(key) {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      /* ignore - session just won't persist across reloads */
    }
  },
  clear(...keys) {
    keys.forEach((key) => {
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    });
  },
};
function JoinForm({ pin, setPin, nickname, setNickname, error, joining, onJoin, go }) {
  return (
    <Shell go={go}>
      <section className="join">
        <p className="kicker">JOIN A LIVE ROOM</p>
        <h1>
          Ready, set,
          <br />
          <em>play.</em>
        </h1>
        <p>Enter the six-digit PIN from your host.</p>
        <form onSubmit={onJoin}>
          <label>
            Game PIN
            <input
              className="pin-input"
              inputMode="numeric"
              maxLength="6"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="000 000"
              required
            />
          </label>
          <label>
            Your nickname
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength="18"
              placeholder="e.g. Quiz wizard"
              required
            />
          </label>
          {error && <div className="error">{error}</div>}
          <button className="primary full" type="submit" disabled={joining}>
            {joining ? "Joining..." : "Enter the room"} <ArrowRight size={18} />
          </button>
        </form>
        <button className="back home-link" onClick={() => go("/")}>
          Back home
        </button>
      </section>
    </Shell>
  );
}
function ScoringInfo() {
  return (
    <div className="scoring-info">
      <strong>HOW SCORING WORKS</strong>
      <p>Each question = 20 points maximum.</p>
      <p>✓ Correct + fastest answer: up to 20 points</p>
      <p>✓ Correct answer: minimum 5 points</p>
      <p>✗ Wrong answer: 0 points</p>
      <p>⏱ Faster correct answers earn more points.</p>
    </div>
  );
}
function PlayerQuestion({ game, question, gameId, playerId }) {
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("idle");
  const [seconds, setSeconds] = useState(null);
  useEffect(() => {
    setSelected(null);
    setStatus("idle");
  }, [game.currentQuestion]);
  useEffect(() => {
    const startedAt = timestampToMillis(game.questionStartedAt);
    const endsAt = timestampToMillis(game.questionEndsAt);
    if (!startedAt || !endsAt || endsAt < startedAt) {
      setSeconds(null);
      return undefined;
    }

    const updateTimer = () => {
      const nextSeconds = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSeconds(nextSeconds);
      return nextSeconds;
    };
    updateTimer();
    const timer = window.setInterval(updateTimer, 250);
    return () => window.clearInterval(timer);
  }, [game.currentQuestion, game.questionStartedAt, game.questionEndsAt]);
  const answer = async (index) => {
    if (selected !== null || seconds === null || seconds <= 0) return;
    setSelected(index);
    setStatus("submitting");
    try {
      await submitAnswer(
        gameId,
        playerId,
        game.currentQuestion,
        index,
      );
      setStatus("submitted");
    } catch (err) {
      console.error("Answer submission failed.", err);
      setStatus("error");
      setSelected(null);
    }
  };
  return (
    <div className="play-question">
      <div className="timer-bar">
        <span
          style={{
            width: `${seconds === null ? 0 : Math.min(100, (seconds / question.timer) * 100)}%`,
          }}
        />
      </div>
      <div className="question-meta">
        <span>QUESTION {game.currentQuestion + 1}</span>
        <strong>{seconds === null ? "Starting..." : `${seconds}s`}</strong>
      </div>
      <h1>{question.text}</h1>
      <div className="play-options">
        {question.options.map((option, index) => (
          <button
            className={`play-option ${colors[index]} ${selected === index ? "selected" : ""}`}
            disabled={selected !== null || seconds === null || seconds <= 0}
            onClick={() => answer(index)}
            key={option}
          >
            <b>{String.fromCharCode(65 + index)}</b>
            {option}
            {selected === index && <Check size={20} />}
          </button>
        ))}
      </div>
      {status === "submitted" && (
        <p className="answer-feedback">Answer submitted &mdash; waiting for the host.</p>
      )}
      {status === "error" && (
        <p className="answer-feedback error">Could not submit your answer. Tap an option to try again.</p>
      )}
    </div>
  );
}
function ResultView({ game, question, players, playerId, finished }) {
  const player = players.find((item) => item.id === playerId);
  const rank =
    [...players]
      .sort((a, b) => b.score - a.score)
      .findIndex((item) => item.id === playerId) + 1;
  return (
    <div className="result-view">
      <Trophy size={42} />
      <p className="kicker">{finished ? "FINAL RANKING" : "ROUND COMPLETE"}</p>
      <h1>
        {finished
          ? "That was a good one."
          : "Nice work, " + (player?.nickname || "") + "."}
      </h1>
      {!finished && (
        <p>
          Your answer:{" "}
          <strong>
            {question?.options[player?.currentAnswer] || "No answer"}
          </strong>
        </p>
      )}
      {game.revealedQuestionIndex === game.currentQuestion ? (
        <div className="answer-result">
          <p>Correct answer: <strong>{String.fromCharCode(65 + game.revealedCorrectOption)} — {question?.options[game.revealedCorrectOption]}</strong></p>
          <p>{player?.lastQuestionIndex === game.currentQuestion && player.lastCorrect ? "Correct" : "Incorrect"} &nbsp; · &nbsp; {player?.lastQuestionIndex === game.currentQuestion ? `${player.lastPoints || 0} points` : "0 points"}</p>
        </div>
      ) : (
        <p className="answer-feedback">The host will reveal the correct answer soon.</p>
      )}
      <div className="result-score">
        <strong>{player?.score || 0}</strong>
        <span>POINTS</span>
      </div>
      <div className="rank-line">
        You are currently <b>#{rank || "-"}</b>
      </div>
      {finished && <Leaderboard players={players} />}
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);
