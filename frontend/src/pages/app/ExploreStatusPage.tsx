import { useState, useEffect, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { TechnicalFilters } from "../../components/explore/TechnicalFilters";
import { CoverageKpis } from "../../components/explore/CoverageKpis";
import { MarketShareChart } from "../../components/explore/MarketShareChart";
import { VolumeCharts } from "../../components/explore/VolumeCharts";
import { StatusMatrix } from "../../components/explore/StatusMatrix";
import { ResultsGrid } from "../../components/explore/ResultsGrid";
import { useFilters } from "../../context/FiltersContext";

export default function ExploreStatusPage() {
  const reduceMotion = useReducedMotion();
  const { filters } = useFilters();
  const [selectedClassification, setSelectedClassification] = useState(() => {
    return localStorage.getItem('explore_selectedClassification') || '';
  });
  const [classifications, setClassifications] = useState<string[]>([]);

  // Charger les classifications au montage
  useEffect(() => {
    const loadClassifications = async () => {
      try {
        const { exploreApi } = await import("../../services/exploreApi");
        const result = await exploreApi.getClassifications();
        if (result.success && result.data && result.data.classifications.length > 0) {
          setClassifications(result.data.classifications);
          if (!selectedClassification) {
            setSelectedClassification(result.data.classifications[0]);
          }
        }
      } catch (error) {
        console.error("Failed to load classifications:", error);
      }
    };
    loadClassifications();
  }, []);

  // Sauvegarder la classification sélectionnée
  useEffect(() => {
    if (selectedClassification) {
      localStorage.setItem('explore_selectedClassification', selectedClassification);
    }
  }, [selectedClassification]);

  // Force re-render when filters change
  const [filterKey, setFilterKey] = useState(0);
  
  useEffect(() => {
    setFilterKey(prev => prev + 1);
    console.log('🔄 [ExploreStatus] Filtres mis à jour:', filters);
  }, [filters.customer, filters.region, filters.snapshot]);

  const activeCustomer = filters.customer || 'Stellantis';
  const activeRegion = filters.region || 'EMEA';
  const activeSnapshot = filters.snapshot || 'Latest import';

  const resetTechnicalFilters = useCallback(() => {
    if (classifications.length > 0) {
      setSelectedClassification(classifications[0]);
    }
  }, [classifications]);

  const matrixSubtitle = `${selectedClassification || 'Terminal'} matrix for ${activeCustomer}. Cell color shows status; cell text shows alternative material group.`;

  const marketShareTitle = `Market share of ${selectedClassification || 'terminals'} for ${activeCustomer}`;
  const marketShareHelper = "Supplier ranking by number of parts in the selected scope.";

  const supplierVolumeTitle = `Annual ${selectedClassification || 'terminal'} volume by supplier for ${activeCustomer}`;
  const supplierVolumeHelper = "Annual terminal volume by supplier in the current scope";

  return (
    <div className="space-y-3" key={filterKey}>
      <motion.header
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0.01 : 0.25 }}
        className="rounded-2xl border border-border bg-surface p-3.5 shadow-sm sm:p-4"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-text">Explore / Status</h1>
        <p className="mt-1 text-sm leading-6 text-muted">
          Review {selectedClassification || 'terminal'} market share, multisourcing exposure, and scoped results by MS groups or parts.
        </p>

        <div className="relative mt-3 rounded-xl border border-border/70 bg-bg/25 px-3.5 py-2.5 sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Filter behavior on this page</h2>
            <span className="rounded-full border border-border/70 bg-surface/85 px-2.5 py-1 text-[11px] font-medium text-muted">
              Customer: {activeCustomer} | Snapshot: {activeSnapshot}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-2.5 gap-y-1.5 text-[12px] text-muted">
            <p className="rounded-full border border-border/60 bg-surface/70 px-2.5 py-1">
              <span className="font-semibold text-text">Applied:</span> Customer, Region
            </p>
            <p className="rounded-full border border-border/60 bg-surface/70 px-2.5 py-1">
              <span className="font-semibold text-text">Local filters:</span> Component material group
            </p>
          </div>
        </div>
      </motion.header>

      <TechnicalFilters
        selectedClassification={selectedClassification}
        onClassificationChange={setSelectedClassification}
        onClearFilters={resetTechnicalFilters}
      />

      <CoverageKpis 
        customer={activeCustomer} 
        region={activeRegion} 
        materialGroup={selectedClassification}
      />

      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0.01 : 0.25, delay: reduceMotion ? 0 : 0.04 }}
        className="grid gap-4 grid-cols-1"
      >
        <MarketShareChart 
          customer={activeCustomer} 
          region={activeRegion} 
          materialGroup={selectedClassification}
          title={marketShareTitle} 
          helper={marketShareHelper} 
        />
        <VolumeCharts
          customer={activeCustomer}
          region={activeRegion}
          materialGroup={selectedClassification}
          supplierVolumeTitle={supplierVolumeTitle}
          supplierVolumeHelper={supplierVolumeHelper}
        />
      </motion.section>

      <StatusMatrix
        customer={activeCustomer}
        region={activeRegion}
        materialGroup={selectedClassification}
        subtitle={matrixSubtitle}
        classification={selectedClassification}
      />

      <ResultsGrid
        customer={activeCustomer}
        region={activeRegion}
        materialGroup={selectedClassification}
      />
    </div>
  );
}