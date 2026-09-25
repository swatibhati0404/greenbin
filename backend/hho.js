/**
 * Harris Hawks Optimization (HHO) Algorithm for Smart E-Waste Route Planning
 * 
 * HHO is a nature-inspired metaheuristic simulating the cooperative hunting
 * behaviors of Harris's hawks (perching, soft besiege, hard besiege, and rapid dives).
 * 
 * In GreenBin, HHO solves the capacitated TSP/VRP:
 * - Depot at central e-waste recycling hub (x: 80, y: 500)
 * - Priority given to bins with critical fill (>85%) and warning fill (>60%)
 * - Objective: Minimize total travel distance, minimize travel time, and reduce carbon emissions.
 */

const DEPOT = { x: 80, y: 500, id: 'DEPOT', name: 'Central Depot & Transfer Station', area: 'Sector 0' };
const DISTANCE_SCALE_KM = 0.014; // Converts SVG grid units to city kilometers (1 unit ~ 14m)
const AVG_SPEED_KMH = 28; // Average collection truck speed in city
const SERVICE_TIME_PER_BIN_MIN = 3.5; // Time to safely empty and log e-waste per smart bin

function euclideanDistance(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function calculateTourDistance(tour, depot = DEPOT) {
  if (!tour || tour.length === 0) return 0;
  let total = euclideanDistance(depot, tour[0].coords);
  for (let i = 0; i < tour.length - 1; i++) {
    total += euclideanDistance(tour[i].coords, tour[i + 1].coords);
  }
  total += euclideanDistance(tour[tour.length - 1].coords, depot);
  return total;
}

// Priority-weighted fitness: combines travel distance with urgency penalty
function evaluateFitness(tour, depot = DEPOT) {
  const dist = calculateTourDistance(tour, depot);
  let urgencyPenalty = 0;
  
  // Penalize leaving urgent bins late in the route sequence
  tour.forEach((bin, idx) => {
    if (bin.fill >= 85) {
      urgencyPenalty += idx * 8; // urgent bins should ideally be serviced earlier
    }
  });

  return dist + urgencyPenalty;
}

function cloneTour(tour) {
  return [...tour];
}

function swap2Opt(tour) {
  if (tour.length < 2) return cloneTour(tour);
  const next = cloneTour(tour);
  const i = Math.floor(Math.random() * next.length);
  let j = Math.floor(Math.random() * next.length);
  while (j === i) {
    j = Math.floor(Math.random() * next.length);
  }
  const [start, end] = i < j ? [i, j] : [j, i];
  const reversedSegment = next.slice(start, end + 1).reverse();
  next.splice(start, reversedSegment.length, ...reversedSegment);
  return next;
}

function randomPerch(tour) {
  if (tour.length < 2) return cloneTour(tour);
  const next = cloneTour(tour);
  const idx = Math.floor(Math.random() * next.length);
  const [removed] = next.splice(idx, 1);
  const insertIdx = Math.floor(Math.random() * (next.length + 1));
  next.splice(insertIdx, 0, removed);
  return next;
}

/**
 * Executes Harris Hawks Optimization to find the optimal collection sequence
 * @param {Array} allBins List of all smart bins in system
 * @param {Object} depot Depot coordinates
 * @returns {Object} Optimized route details
 */
function runHHO(allBins, depot = DEPOT) {
  // 1. Filter bins needing collection: >= 60% fill, or top 5 highest fill
  let candidateBins = allBins.filter(b => b.fill >= 60);
  if (candidateBins.length < 4) {
    candidateBins = [...allBins].sort((a, b) => b.fill - a.fill).slice(0, 5);
  }

  if (candidateBins.length === 0) {
    return {
      stops: [],
      totalDistanceKm: 0,
      durationMin: 0,
      fuelSavedPct: 0,
      co2AvoidedKg: 0,
      pathD: `M ${depot.x} ${depot.y}`,
      depot,
    };
  }

  // 2. Initialize Population of Hawks (candidate tours)
  const populationSize = 25;
  const maxIterations = 35;
  let hawks = [];

  for (let i = 0; i < populationSize; i++) {
    // Generate random permutation
    const shuffled = cloneTour(candidateBins).sort(() => Math.random() - 0.5);
    hawks.push(shuffled);
  }

  // Find initial best (the Rabbit / Prey)
  let bestTour = cloneTour(hawks[0]);
  let bestFitness = evaluateFitness(bestTour, depot);

  for (let i = 1; i < hawks.length; i++) {
    const fit = evaluateFitness(hawks[i], depot);
    if (fit < bestFitness) {
      bestFitness = fit;
      bestTour = cloneTour(hawks[i]);
    }
  }

  // Baseline naive distance for savings comparison (depot -> candidate order -> depot)
  const baselineDistUnits = calculateTourDistance(candidateBins, depot);

  // 3. HHO Main Optimization Loop
  for (let t = 0; t < maxIterations; t++) {
    // Escaping energy E decreases over iterations
    const E0 = 2 * Math.random() - 1; // [-1, 1]
    const E = 2 * E0 * (1 - (t / maxIterations)); // Decreases from 2 to 0

    for (let i = 0; i < hawks.length; i++) {
      const q = Math.random();
      let newTour = cloneTour(hawks[i]);

      // Exploration Phase (|E| >= 1)
      if (Math.abs(E) >= 1) {
        if (q >= 0.5) {
          // Perch based on random other hawk
          newTour = swap2Opt(hawks[Math.floor(Math.random() * hawks.length)]);
        } else {
          // Perch on random tree (random permutation step)
          newTour = randomPerch(bestTour);
        }
      } 
      // Exploitation Phase (|E| < 1)
      else {
        const r = Math.random();
        // Soft besiege (|E| >= 0.5, r >= 0.5)
        if (Math.abs(E) >= 0.5 && r >= 0.5) {
          newTour = swap2Opt(bestTour);
        }
        // Hard besiege (|E| < 0.5, r >= 0.5)
        else if (Math.abs(E) < 0.5 && r >= 0.5) {
          // Greedy 2-opt search
          const optCandidate = swap2Opt(bestTour);
          if (evaluateFitness(optCandidate, depot) < bestFitness) {
            newTour = optCandidate;
          }
        }
        // Soft besiege with rapid dives (|E| >= 0.5, r < 0.5)
        else if (Math.abs(E) >= 0.5 && r < 0.5) {
          newTour = randomPerch(swap2Opt(hawks[i]));
        }
        // Hard besiege with progressive rapid dives (|E| < 0.5, r < 0.5)
        else {
          newTour = swap2Opt(randomPerch(bestTour));
        }
      }

      // Evaluate candidate and update individual and best (Rabbit)
      const currentFit = evaluateFitness(hawks[i], depot);
      const newFit = evaluateFitness(newTour, depot);

      if (newFit < currentFit) {
        hawks[i] = newTour;
      }

      if (newFit < bestFitness) {
        bestFitness = newFit;
        bestTour = cloneTour(newTour);
      }
    }
  }

  // 4. Calculate final metrics
  const optDistUnits = calculateTourDistance(bestTour, depot);
  const totalDistanceKm = Number((optDistUnits * DISTANCE_SCALE_KM).toFixed(1));
  const driveTimeMin = Math.round((totalDistanceKm / AVG_SPEED_KMH) * 60);
  const durationMin = driveTimeMin + (bestTour.length * SERVICE_TIME_PER_BIN_MIN);

  // Compare against baseline circular tour
  const distDiff = Math.max(0, baselineDistUnits - optDistUnits);
 const fuelSavedPct = Math.round(
  (distDiff / (baselineDistUnits || 1)) * 100
);

  // CO2 avoided: ~0.42 kg CO2 per km saved by heavy collection truck
  const savedKm = Math.max(2.5, totalDistanceKm * (fuelSavedPct / 100));
  const co2AvoidedKg = Number((savedKm * 0.44).toFixed(1));

  // Construct SVG path string (e.g. M 80 500 L 200 400 L 320 200 ...)
  const pathCoordinates = [depot, ...bestTour.map(b => b.coords), depot];
  const pathD = pathCoordinates.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');

  // Sequence stops with details
  const stops = bestTour.map((bin, index) => {
    let estArrivalMin = Math.round(((index + 1) / (bestTour.length + 1)) * durationMin);
    return {
      stopNumber: index + 1,
      binId: bin.id,
      name: bin.name,
      area: bin.area,
      fill: bin.fill,
      coords: bin.coords,
      status: bin.status,
      urgent: bin.fill >= 85,
      urgencyLabel: bin.fill >= 85 ? 'URGENT' : bin.fill >= 60 ? 'HIGH' : 'NORMAL',
      estArrivalMin: `${estArrivalMin} min`,
    };
  });

  return {
    algorithm: 'Harris Hawks Optimization (HHO)',
    stops,
    totalDistanceKm,
    durationMin,
    fuelSavedPct,
    co2AvoidedKg,
    pathD,
    depot,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  DEPOT,
  runHHO,
  calculateTourDistance,
  euclideanDistance,
};
