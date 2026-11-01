import ResultView from "@/components/renewal/ResultView";

export default function ResultsPage({ params }: { params: { id: string } }) {
  return <ResultView leadId={params.id} />;
}
