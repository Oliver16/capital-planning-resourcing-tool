import React from 'react';
import CapitalPlanningTool from './components/CapitalPlanningTool';
import AuthGate from './components/auth/AuthGate';

function App() {
  return (
    <AuthGate>
      <CapitalPlanningTool />
    </AuthGate>
  );
}

export default App;
