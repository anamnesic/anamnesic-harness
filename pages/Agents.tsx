import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AgentStatusPanel from '../components/AgentStatusPanel';

const Agents = () => {
  return (
    <div>
      <Header />
      <main>
        <h2>Agentes</h2>
        <AgentStatusPanel />
      </main>
      <Footer />
    </div>
  );
};

export default Agents;
