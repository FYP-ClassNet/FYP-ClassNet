interface QuizQuestion {
  id: string;
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
}

interface Props {
  quiz: { id: string; title: string; mode: string; total_questions: number };
  questions: QuizQuestion[];
  answers: Record<string, string>;
  quizEnded: boolean;
  onSubmitAnswer: (questionId: string, option: string) => void;
}

const OPTIONS = ["A", "B", "C", "D"] as const;

function getOptionText(q: QuizQuestion, opt: string) {
  if (opt === "A") return q.option_a;
  if (opt === "B") return q.option_b;
  if (opt === "C") return q.option_c;
  return q.option_d;
}

export function QuizPanel({ quiz, questions, answers, quizEnded, onSubmitAnswer }: Props) {
  const answeredCount = Object.keys(answers).length;

  if (quizEnded) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-3">
        <div className="text-center py-4">
          <p className="text-2xl mb-2">🎉</p>
          <p className="text-white font-semibold">Quiz Ended</p>
          <p className="text-zinc-500 text-sm mt-1">
            You answered {answeredCount} of {quiz.total_questions} questions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">

      {/* Quiz header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold">{quiz.title}</h2>
          <p className="text-zinc-500 text-xs mt-0.5">
            {answeredCount}/{quiz.total_questions} answered
          </p>
        </div>
        <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded-lg">
          {quiz.mode === "csv" ? "MCQ" : "Oral"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-zinc-800 rounded-full h-1.5">
        <div
          className="bg-emerald-500 h-1.5 rounded-full transition-all"
          style={{ width: `${(answeredCount / quiz.total_questions) * 100}%` }}
        />
      </div>

      {/* Questions */}
      <div className="flex flex-col gap-4 max-h-96 overflow-y-auto">
        {questions.map((q) => (
          <div key={q.id} className="bg-zinc-800 rounded-xl p-4 flex flex-col gap-3">
            <p className="text-white text-sm font-medium">
              <span className="text-zinc-500 mr-2">Q{q.question_number}.</span>
              {q.question_text}
            </p>

            <div className="grid grid-cols-2 gap-2">
              {OPTIONS.map((opt) => {
                const selected = answers[q.id] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => onSubmitAnswer(q.id, opt)}
                    className={`px-3 py-2.5 rounded-lg text-sm text-left transition-all ${
                      selected
                        ? "bg-emerald-600 text-white border-2 border-emerald-500"
                        : "bg-zinc-700 hover:bg-zinc-600 text-zinc-300 border-2 border-transparent"
                    }`}
                  >
                    <span className="font-bold mr-2">{opt}.</span>
                    {getOptionText(q, opt)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}