import { Droplet, Activity, Bone, BrainCircuit } from 'lucide-react';

export const calculatorsList = [
  { 
    id: 'iv', 
    title: 'IV Fluid (4-2-1)', 
    icon: Droplet, 
    activeColorClass: 'text-blue-600',
    tags: 'iv fluid maintenance 4-2-1 water',
    component: 'IVFluidCalc'
  },
  { 
    id: 'crcl', 
    title: 'CrCl (Cockcroft-Gault)', 
    icon: Activity, 
    activeColorClass: 'text-amber-600',
    tags: 'crcl creatinine clearance kidney ckd egfr cockcroft gault',
    component: 'CrClCalc'
  },
  { 
    id: 'ca', 
    title: 'Corrected Calcium', 
    icon: Bone, 
    activeColorClass: 'text-purple-600',
    tags: 'ca calcium corrected albumin hypoalbuminemia',
    component: 'CorrectedCaCalc'
  },
  { 
    id: 'gcs', 
    title: 'GCS Score', 
    icon: BrainCircuit, 
    activeColorClass: 'text-pink-600',
    tags: 'gcs glasgow coma scale neuro brain head',
    component: 'GCSCalc'
  }
];
