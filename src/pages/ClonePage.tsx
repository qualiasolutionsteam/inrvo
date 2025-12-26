import React, { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import AppLayout from '../layouts/AppLayout';

const SimpleVoiceClone = lazy(() => import('../../components/SimpleVoiceClone').then(m => ({ default: m.SimpleVoiceClone })));

const ClonePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    cloningStatus,
    setCloningStatus,
    creditInfo,
  } = useApp();

  const handleRecordingComplete = async (audioBlob: Blob) => {
    // The SimpleVoiceClone component handles the full cloning flow
    console.log('Clone recording complete');
  };

  return (
    <AppLayout className="flex flex-col">
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <SimpleVoiceClone
          onClose={() => {
            setCloningStatus({ state: 'idle' });
            navigate('/');
          }}
          onRecordingComplete={handleRecordingComplete}
          cloningStatus={cloningStatus}
          creditInfo={creditInfo}
        />
      </Suspense>
    </AppLayout>
  );
};

export default ClonePage;
