/** 表单里的一个字段：标题 + 内容 + 可选说明 */
export default function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 text-[13px] font-medium text-ink-2">
        {label}
        {required ? <span className="ml-1 text-[#c4300c]">*</span> : null}
      </div>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-[#c4300c]">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}