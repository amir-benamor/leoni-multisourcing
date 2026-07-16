import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { findGroupByMs, getDominantPartNumberByMs } from "../../data/mockComponentDetail";

export default function MsRedirectPage() {
  const { msNumber = "" } = useParams();
  const navigate = useNavigate();

  const group = findGroupByMs(msNumber);

  useEffect(() => {
    if (!group) return;

    const nextPartNumber = getDominantPartNumberByMs(group.msNumber) ?? group.defaultPN;
    navigate(`/app/m3/component/${encodeURIComponent(nextPartNumber)}`, { replace: true });
  }, [group, navigate]);

  if (!group) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-premium">
        <h1 className="text-xl font-semibold">MS group not found</h1>
        <p className="mt-2 text-sm text-muted">No mock group matches {msNumber}.</p>
        <Link
          to="/app/explore"
          className="animated-link mt-4 inline-block text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Go to Explore
        </Link>
      </section>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted shadow-premium">
      Resolving default part for {msNumber}...
    </div>
  );
}
