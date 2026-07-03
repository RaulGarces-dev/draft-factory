import React from 'react';
import { Toaster } from 'sonner';
import { Routes, Route } from 'react-router-dom';
import LayoutConstructor from './features/constructor/LayoutConstructor';
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
            <LayoutConstructor>
              <Generator />
            </LayoutConstructor>
          } 
        />
        
        {/* Nueva herramienta: Variantes IA */}
        <Route 
          path="/variantes-ia" 
          element={
            <LayoutConstructor>
              <GeneratorIa />
            </LayoutConstructor>
          } 
        />

        {/* Constructor IA */}
        <Route 
          path="/constructor" 
          element={
            <LayoutConstructor>
              <ConstructorView />
            </LayoutConstructor>
          } 
        />
      </Routes>
    </>
  );
}

export default App;
