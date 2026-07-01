import React from 'react';
import { Toaster } from 'sonner';
import Generator from './features/generator/Generator';

function App() {
  return (
    <>
      <Toaster position="top-center" richColors />
      <Generator />
    </>
  );
}

export default App;
