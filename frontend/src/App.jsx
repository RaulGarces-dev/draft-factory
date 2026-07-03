import React from 'react';
import { Toaster } from 'sonner';
import { Routes, Route } from 'react-router-dom';
import VarioLayout from './components/layout/VarioLayout';
import Generator from './features/generator/Generator';
import GeneratorIa from './features/generator_ia/GeneratorIa';
import ConstructorView from './features/constructor/ConstructorView';

function App() {
  return (
    <>
      <Toaster position="top-center" richColors />
      <Routes>
        {/* Generador Estático (Original) */}
        <Route
          path="/"
          element={
            <VarioLayout>
              <Generator />
            </VarioLayout>
          }
        />

        {/* Nueva herramienta: Variantes IA */}
        <Route
          path="/variantes-ia"
          element={
            <VarioLayout>
              <GeneratorIa />
            </VarioLayout>
          }
        />

        {/* Constructor IA */}
        <Route
          path="/constructor"
          element={
            <VarioLayout>
              <ConstructorView />
            </VarioLayout>
          }
        />
      </Routes>
    </>
  );
}

export default App;
