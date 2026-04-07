import React from 'react';
import { motion } from 'motion/react';
import { Check, Shield, Zap, Globe, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Modal } from './ui/Modal';

interface PlanProps {
  name: string;
  price: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  isCurrent?: boolean;
  onUpgrade?: () => void;
  highlight?: boolean;
}

const PlanCard: React.FC<PlanProps> = ({ name, price, description, features, icon, isCurrent, onUpgrade, highlight }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`p-10 border ${highlight ? 'border-white/20 bg-white/[0.03]' : 'border-white/5 bg-white/[0.01]'} rounded-[2.5rem] flex flex-col h-full hover:bg-white/[0.04] transition-all group`}
  >
    <div className="mb-8">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${highlight ? 'bg-white text-black' : 'bg-white/5 text-white'}`}>
        {icon}
      </div>
      <h3 className="text-2xl font-display font-bold uppercase tracking-tighter mb-2">{name}</h3>
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-5xl font-display font-bold tracking-tighter">{price}</span>
        <span className="text-white/30 text-xs font-bold uppercase tracking-widest">/mo</span>
      </div>
      <p className="text-white/40 text-sm leading-relaxed">{description}</p>
    </div>

    <div className="flex-grow space-y-4 mb-10">
      {features.map((feature, i) => (
        <div key={i} className="flex items-start gap-3 text-xs">
          <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center mt-0.5 flex-shrink-0">
            <Check className="w-2.5 h-2.5 text-white" />
          </div>
          <span className="text-white/60 font-medium uppercase tracking-wider leading-tight">{feature}</span>
        </div>
      ))}
    </div>

    <button
      onClick={onUpgrade}
      disabled={isCurrent}
      className={`w-full py-5 px-6 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3
        ${isCurrent 
          ? 'bg-white/5 text-white/20 cursor-default' 
          : highlight 
            ? 'bg-white text-black hover:bg-white/90' 
            : 'border border-white/10 text-white hover:bg-white/5'}`}
    >
      {isCurrent ? 'Current Infrastructure' : 'Select Infrastructure'}
      {!isCurrent && <ArrowRight className="w-4 h-4" />}
    </button>
  </motion.div>
);

export const Pricing: React.FC = () => {
  const { user, subscription } = useAuth();
  const [showSuccessModal, setShowSuccessModal] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState('');

  const handleUpgrade = async (plan: string) => {
    if (!user) return;
    
    const userRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userRef, {
        'subscription.plan': plan,
        'subscription.status': 'active',
        'subscription.updatedAt': new Date().toISOString()
      });
      setSelectedPlan(plan);
      setShowSuccessModal(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-20">
      <div className="text-center mb-24 space-y-6">
        <div className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/30">Pricing & Access</div>
        <h2 className="text-6xl font-display font-bold uppercase tracking-tighter leading-none">
          Sentinel <span className="text-white/20">Access</span>
        </h2>
        <p className="text-white/40 text-lg max-w-2xl mx-auto font-light leading-relaxed">
          Scale your safety infrastructure with enterprise-grade logic gates and real-time evaluation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <PlanCard
          name="Free"
          price="$0"
          description="Essential safety for individual developers."
          icon={<Shield className="w-6 h-6" />}
          isCurrent={subscription?.plan === 'free'}
          features={[
            "5 Protected Sessions / mo",
            "4 Core AI Models",
            "Standard Sentinel Logic",
            "Basic Chat History",
            "Community Support"
          ]}
          onUpgrade={() => handleUpgrade('free')}
        />

        <PlanCard
          name="Pro"
          price="$29"
          description="Advanced protection for power users and small teams."
          icon={<Zap className="w-6 h-6" />}
          highlight
          isCurrent={subscription?.plan === 'pro'}
          features={[
            "Unlimited Protected Sessions",
            "9 Total AI Models",
            "Advanced Logic Gates",
            "Session Management",
            "Auto-naming Logic",
            "Priority Support"
          ]}
          onUpgrade={() => handleUpgrade('pro')}
        />

        <PlanCard
          name="Enterprise"
          price="$199"
          description="Custom safety infrastructure for large organizations."
          icon={<Globe className="w-6 h-6" />}
          isCurrent={subscription?.plan === 'enterprise'}
          features={[
            "Everything in Pro",
            "25 Total AI Models",
            "Custom Fine-tuning",
            "Dedicated Engineer",
            "Advanced Audit Logs",
            "White-label Integration"
          ]}
          onUpgrade={() => handleUpgrade('enterprise')}
        />
      </div>

      <div className="mt-24 p-12 border border-white/5 bg-white/[0.01] rounded-[3rem] flex flex-col md:flex-row items-center justify-between gap-12">
        <div className="flex items-center gap-8">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-white/40">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-xl font-display font-bold uppercase tracking-tight">Secure Integration</h4>
            <p className="text-white/30 text-sm mt-1">Sentinel uses end-to-end encryption for all safety evaluations.</p>
          </div>
        </div>
        <div className="flex gap-6">
          <span className="px-5 py-2 border border-white/5 rounded-full text-[9px] font-bold text-white/40 uppercase tracking-[0.2em]">SOC2 Compliant</span>
          <span className="px-5 py-2 border border-white/5 rounded-full text-[9px] font-bold text-white/40 uppercase tracking-[0.2em]">GDPR Ready</span>
        </div>
      </div>

      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Infrastructure Updated"
      >
        <div className="p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto">
            <Check size={40} />
          </div>
          <div>
            <h3 className="text-2xl font-display font-bold uppercase tracking-tight">Access Granted</h3>
            <p className="text-white/40 text-sm mt-2">You have successfully upgraded to the <span className="text-white font-bold uppercase tracking-widest">{selectedPlan}</span> plan.</p>
          </div>
          <button 
            onClick={() => setShowSuccessModal(false)}
            className="w-full py-4 bg-white text-black rounded-2xl font-bold text-xs uppercase tracking-widest"
          >
            Return to Dashboard
          </button>
        </div>
      </Modal>
    </div>
  );
};

