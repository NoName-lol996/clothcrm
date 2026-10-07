/** 客户姓名首字做的小圆头像 */
export default function Avatar({
  name,
  size = 36,
}: {
  name: string;
  size?: number;
}) {
  const initial = name.trim().slice(0, 1);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#f0f0f2] font-medium text-ink-2"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </span>
  );
}