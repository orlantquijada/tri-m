import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

type Match = { distributorId: number; fullName: string; id: number };

type Props = {
  currentCustomerId?: number;
  matches: Match[];
};

export function DuplicatePhoneWarning({ matches, currentCustomerId }: Props) {
  const others = matches.filter((m) => m.id !== currentCustomerId);
  if (!others.length) {
    return null;
  }
  return (
    <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-medium">Phone number already in use</p>
        <ul className="mt-1 space-y-0.5">
          {others.map((m) => (
            <li key={m.id}>
              <Link
                to="/customers/$id"
                params={{ id: String(m.id) }}
                className="underline hover:no-underline"
              >
                {m.fullName}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
