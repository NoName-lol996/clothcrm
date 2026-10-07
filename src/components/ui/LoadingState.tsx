/** 数据从浏览器里读出来之前，短暂显示的内容 */
export default function LoadingState() {
  return (
    <div className="flex items-center justify-center py-32 text-sm text-ink-3">
      正在加载…
    </div>
  );
}