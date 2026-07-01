import React from 'react';
import { Toaster } from 'sonner';
import { Routes, Route } from 'react-router-dom';
import Generator from './features/generator/Generator';
import ConstructorRoute from './features/constructor/ConstructorRoute';

function App() {
  return (
    <>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/" element={<Generator />} />
        <Route path="/constructor" element={<ConstructorRoute />} />
      </Routes>
    </>
  );
}

export default App;
