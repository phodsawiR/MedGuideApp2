import React, { useState } from 'react';
import { Calculator } from 'lucide-react';
import { calculatorsList } from '../data/calculatorsList';
import { IVFluidCalc } from './calculators/IVFluidCalc';
import { CrClCalc } from './calculators/CrClCalc';
import { CorrectedCaCalc } from './calculators/CorrectedCaCalc';
import { GCSCalc } from './calculators/GCSCalc';

const componentMap = {
  'IVFluidCalc': IVFluidCalc,
  'CrClCalc': CrClCalc,
  'CorrectedCaCalc': CorrectedCaCalc,
  'GCSCalc': GCSCalc
};

const ClinicalCalculatorView = () => {
  const [activeTab, setActiveTab] = useState('iv');
  const [searchQuery, setSearchQuery] = useState('');

  const isSearchMode = searchQuery.length > 0;

  const filteredCalculators = calculatorsList.filter(c => {
    if (!isSearchMode) return true;
    return c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
           c.tags.includes(searchQuery.toLowerCase());
  });

  const activeCalculators = isSearchMode 
    ? filteredCalculators 
    : calculatorsList.filter(c => c.id === activeTab);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="🔍 ค้นหาใน Clinical Calculator (เช่น Fluid, CrCl, GCS)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all text-sm shadow-sm"
          />
          <div className="absolute left-3 top-3.5 text-gray-400">
            <Calculator size={18} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row">
        {!isSearchMode && (
          <div className="flex flex-col bg-gray-50 p-3 border-b md:border-b-0 md:border-r border-gray-200 md:w-64 shrink-0 space-y-2">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">Calculators</h4>
            {calculatorsList.map(calc => {
              const Icon = calc.icon;
              const isActive = activeTab === calc.id;
              return (
                <button
                  key={calc.id}
                  onClick={() => setActiveTab(calc.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${
                    isActive ? ('bg-white shadow-sm ' + calc.activeColorClass + ' border border-gray-200') : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={18} /> <span>{calc.title}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="p-4 md:p-6 bg-slate-50 min-h-[500px] flex-1 space-y-8">
          {isSearchMode && filteredCalculators.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              ไม่พบเครื่องคิดเลขที่ตรงกับการค้นหา "{searchQuery}"
            </div>
          )}

          {activeCalculators.map(calc => {
            const Component = componentMap[calc.component];
            return <Component key={calc.id} />;
          })}
        </div>
      </div>
    </div>
  );
};

export { ClinicalCalculatorView };
