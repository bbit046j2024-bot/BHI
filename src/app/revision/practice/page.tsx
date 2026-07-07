import { getAllQuestions, getAllExplanations } from "@/lib/data";
import PracticeClient from "./PracticeClient";

export const metadata = {
  title: "Practice Quiz | BHI Revision",
  description: "Randomised practice quiz mode — filter by subject and topic.",
};

export default function PracticePage() {
  const questions = getAllQuestions();
  const explanations = getAllExplanations();

  // Pass serialisable data to client
  const explanationMap: Record<string, string> = {};
  questions.forEach((q) => {
    explanationMap[q.id] = explanations[q.id]?.explanation ?? "";
  });

  return <PracticeClient questions={questions} explanations={explanationMap} />;
}
