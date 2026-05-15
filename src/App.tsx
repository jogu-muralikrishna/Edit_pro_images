import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ImageEditor from './pages/ImageEditor';
import AdminPanel from './pages/AdminPanel2025';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ImageEditor />} />
      <Route path="/admin-intelligence-hub-2025" element={<AdminPanel />} />
    </Routes>
  );
}
