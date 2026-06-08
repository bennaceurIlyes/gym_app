import React, { useState } from 'react';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import PushUpTrackerScreen from './src/screens/PushUpTrackerScreen';
import ExerciseDetailScreen from './src/screens/ExerciseDetailScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login'); // 'login' | 'dashboard' | 'pushup_tracker' | 'exercise_detail'
  const [selectedExercise, setSelectedExercise] = useState(null);

  const handleLoginSuccess = (email) => {
    setCurrentScreen('dashboard');
  };

  const handleBypassLogin = () => {
    setCurrentScreen('dashboard');
  };

  const handleSignOut = () => {
    setCurrentScreen('login');
  };

  const handleSelectExercise = (exercise) => {
    if (exercise.id === 'pushup') {
      setCurrentScreen('pushup_tracker');
    } else {
      setSelectedExercise(exercise);
      setCurrentScreen('exercise_detail');
    }
  };

  // Render screens dynamically based on state
  switch (currentScreen) {
    case 'login':
      return (
        <LoginScreen 
          onLoginSuccess={handleLoginSuccess} 
          onBypassLogin={handleBypassLogin} 
        />
      );
    case 'dashboard':
      return (
        <DashboardScreen 
          onSelectExercise={handleSelectExercise} 
          onSignOut={handleSignOut} 
        />
      );
    case 'pushup_tracker':
      return (
        <PushUpTrackerScreen 
          onBack={() => setCurrentScreen('dashboard')} 
        />
      );
    case 'exercise_detail':
      return (
        <ExerciseDetailScreen 
          exercise={selectedExercise} 
          onBack={() => setCurrentScreen('dashboard')} 
        />
      );
    default:
      return (
        <LoginScreen 
          onLoginSuccess={handleLoginSuccess} 
          onBypassLogin={handleBypassLogin} 
        />
      );
  }
}
