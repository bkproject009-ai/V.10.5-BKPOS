import POS from './POS';

const KasirFront = () => {
  // Only render POS, no navigation or other UI
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-2 sm:px-4">
      <div className="w-full max-w-4xl mx-auto sm:rounded-lg sm:shadow-lg bg-white sm:bg-background p-2 sm:p-6">
        <POS />
      </div>
    </div>
  );
};

export default KasirFront;
