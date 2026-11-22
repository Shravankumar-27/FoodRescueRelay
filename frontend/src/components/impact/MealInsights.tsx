import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../features/auth/AuthContext";
import { apiRequest } from "../../lib/api";
import Card from "../ui/Card";
import { ratingFields, portionFields, portionOptions } from "../rescue/MealFeedback";

interface Insights {
  responses: number;
  minimum: number;
  averages: Record<string, number>;
  portions: Record<string, Record<string, number>>;
}

export default function MealInsights() {
  const { token } = useAuth();
  const query = useQuery({ queryKey: ["meal-insights"], queryFn: () => apiRequest<Insights>("/impact/meal-insights", { token }) });
  const data = query.data;
  return <Card>
    <h3 className="text-lg font-semibold">Meal feedback and menu insights</h3>
    {query.isPending && <p className="mt-2 text-sm text-muted">Loading meal feedback…</p>}
    {query.isError && <p role="alert" className="mt-2 text-sm text-danger">{query.error.message} <button className="underline" onClick={() => void query.refetch()}>Try again</button></p>}
    {data && <p className="mt-2 text-sm text-muted">{data.responses} {data.responses === 1 ? "response" : "responses"} from partner kitchens.{data.responses < data.minimum && ` Combined insights appear after ${data.minimum} responses.`}</p>}
    {data && data.responses >= data.minimum && <>
      <dl className="mt-3 grid gap-2 sm:grid-cols-3">
        {ratingFields.map(([field, label]) => <div key={field} className="rounded-xl bg-primaryLight/60 p-3"><dt className="text-sm">{label}</dt><dd className="font-semibold">{data.averages[field]} / 5</dd></div>)}
      </dl>
      <dl className="mt-3 space-y-2 text-sm">
        {portionFields.map(([field, label]) => <div key={field}><dt className="font-semibold">{label}</dt><dd>{portionOptions.filter(([value]) => data.portions[field][value])
          .map(([value, text]) => `${text} (${data.portions[field][value]})`).join(" · ")}</dd></div>)}
      </dl>
    </>}
  </Card>;
}
