import React from 'react';
import * as Switch from '@radix-ui/react-switch';
import styles from './Toggle.module.css';

const Toggle = ({ checked, onChange, label }) => {
  return (
    <div className={styles.container}>
      <label className={styles.label}>{label}</label>
      <Switch.Root 
        className={styles.root} 
        checked={checked} 
        onCheckedChange={onChange}
      >
        <Switch.Thumb className={styles.thumb} />
      </Switch.Root>
    </div>
  );
};

export default Toggle;
