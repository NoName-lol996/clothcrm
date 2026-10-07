export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <p className="gc-eyebrow mb-3">{eyebrow}</p> : null}
        <h1 className="gc-title-xl">{title}</h1>
        {subtitle ? <p className="gc-subtitle mt-3 max-w-[560px]">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex items-center gap-3">{action}</div> : null}
    </div>
  );
}