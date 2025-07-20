export default function Loading() {
  // Bu, dashboard altındaki sayfalar verilerini sunucudan alana kadar
  // otomatik olarak gösterilecek olan yüklenme animasyonudur.
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
    </div>
  );
}