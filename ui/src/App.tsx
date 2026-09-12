import React, { useState } from 'react';
import CreateProjectModal from './components/createProjectModal';

export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div style={{ padding: '20px' }}>
      <h1>My Video Editor</h1>
      
      {/* Button to trigger the modal */}
      <button onClick={() => setIsModalOpen(true)}>
        Create New Project
      </button>

       {isModalOpen && (
        <CreateProjectModal
          onClose={() => setIsModalOpen(false)} 
          onProjectCreated={() => {
            console.log("Project created!");
            setIsModalOpen(false);
          }} 
        />
      )}
    </div>
  );
}
