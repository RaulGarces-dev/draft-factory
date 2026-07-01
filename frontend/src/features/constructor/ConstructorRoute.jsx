import React from 'react';
import LayoutConstructor from './LayoutConstructor';
import ConstructorView from './ConstructorView';

export default function ConstructorRoute() {
  return (
    <LayoutConstructor>
      <ConstructorView />
    </LayoutConstructor>
  );
}
