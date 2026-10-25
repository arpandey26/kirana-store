import {
  auth, db,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  doc, getDoc, setDoc, onSnapshot,
  collection, addDoc, getDocs, query, orderBy, limit
} from './firebase.js';

const STORAGE_KEY = 'kirana_hishab_fluent_v1';

    // Default initial dataset tailored directly to the user's examples:
    // 1. Marlboro Ice Blast (10 packets, packet cost vs packet sell vs single loose sell)
    // 2. Packaged Atta (500gm & 5kg packets)
    // 3. Loose Bulk Atta (bought in bulk kg, sold by custom weight or ₹ value)
    // Plus dead-stock items to demonstrate the Unsold Radar
    function getInitialState() {
      const now = Date.now();
      const dayMs = 86400000;
      return {
        privacyMask: false,
        activePeriod: 'today',
        activeUserId: 'u_owner',
        shop: {
          name: 'Laxmi Narayana Kirana & General Store',
          owner: 'Sandeep Kumar',
          phone: '+91 98480 52910',
          gst: '36AABCU9603R1Z2',
          city: 'Ameerpet, Hyderabad'
        },
        users: [
          { id: 'u_owner', name: 'Sandeep (Shop Owner)', role: 'OWNER', badge: 'Full Hisab & Profit Admin', active: true, password: 'owner123' },
          { id: 'u_operator1', name: 'Ramesh (Counter Guy)', role: 'OPERATOR', badge: 'Counter POS & Stock Entry', active: true, password: 'ramesh123' },
          { id: 'u_operator2', name: 'Mohan (Evening Helper)', role: 'OPERATOR', badge: 'Counter POS Only', active: true, password: 'mohan123' }
        ],
        products: [
          {
            id: 'p_marlboro_ice',
            name: 'Marlboro Ice Blast (menthol)',
            category: 'Cigarettes & Tobacco',
            type: 'PACKET_LOOSE',
            packetsInStock: 10,
            unitsPerPacket: 20,
            looseUnitsInStock: 6,
            packetBuyCost: 310,
            packetSellPrice: 340,
            singleUnitSellPrice: 18,
            createdAt: now - 15 * dayMs,
            lastSoldAt: now - 1800000 // Sold 30 mins ago
          },
          {
            id: 'p_atta_500g',
            name: 'Aashirvaad Select Sharbati Atta (500gm Pack)',
            category: 'Packaged Staples & Atta',
            type: 'PACKAGED_WEIGHT',
            variantLabel: '500gm Packet',
            stockQty: 24,
            buyCostPerUnit: 27,
            sellPricePerUnit: 33,
            createdAt: now - 12 * dayMs,
            lastSoldAt: now - 3600000 // Sold 1 hr ago
          },
          {
            id: 'p_atta_5kg',
            name: 'Aashirvaad Shudh Chakki Atta (5kg Pack)',
            category: 'Packaged Staples & Atta',
            type: 'PACKAGED_WEIGHT',
            variantLabel: '5kg Family Bag',
            stockQty: 12,
            buyCostPerUnit: 225,
            sellPricePerUnit: 255,
            createdAt: now - 14 * dayMs,
            lastSoldAt: now - 7200000
          },
          {
            id: 'p_loose_atta',
            name: 'Loose MP Sharbati Chakki Atta (Bulk Sack)',
            category: 'Loose Grains & Flour',
            type: 'LOOSE_BULK',
            stockKg: 65.5,
            buyCostPerKg: 35,
            sellPricePerKg: 44,
            createdAt: now - 20 * dayMs,
            lastSoldAt: now - 900000 // Sold 15 mins ago
          },
          {
            id: 'p_loose_rice',
            name: 'Loose Sona Masoori Steam Rice (Old Crop)',
            category: 'Loose Grains & Flour',
            type: 'LOOSE_BULK',
            stockKg: 80.0,
            buyCostPerKg: 48,
            sellPricePerKg: 58,
            createdAt: now - 18 * dayMs,
            lastSoldAt: now - 5400000
          },
          {
            id: 'p_choco_box',
            name: 'Cadbury Dairy Milk Silk Bubbly (Box of 12)',
            category: 'Chocolates & Confectionery',
            type: 'PACKET_LOOSE',
            packetsInStock: 4,
            unitsPerPacket: 12,
            looseUnitsInStock: 3,
            packetBuyCost: 900,
            packetSellPrice: 980,
            singleUnitSellPrice: 85,
            createdAt: now - 21 * dayMs,
            lastSoldAt: now - 11 * dayMs // Unsold for 11 days! Dead-stock candidate
          },
          {
            id: 'p_olive_oil_dead',
            name: 'Imported Extra Virgin Olive Oil (1 Litre Tin)',
            category: 'Cooking Oils & Ghee',
            type: 'PACKAGED_WEIGHT',
            variantLabel: '1 Litre Tin',
            stockQty: 5,
            buyCostPerUnit: 780,
            sellPricePerUnit: 920,
            createdAt: now - 25 * dayMs,
            lastSoldAt: null // Never sold! Dead-stock alert
          }
        ],
        transactions: [
          {
            id: 'tx_101',
            timestamp: now - 7200000,
            operatorId: 'u_operator1',
            operatorName: 'Ramesh (Counter Guy)',
            customerName: 'Venkat Rao',
            paymentMode: 'UPI / QR',
            totalRevenue: 439,
            totalCost: 374.5,
            totalProfit: 64.5,
            items: [
              { productId: 'p_marlboro_ice', productName: 'Marlboro Ice Blast (menthol)', saleModeLabel: '1 Full Packet', qty: 1, revenue: 340, cost: 310, profit: 30 },
              { productId: 'p_atta_500g', productName: 'Aashirvaad Select Sharbati Atta (500gm Pack)', saleModeLabel: '3 x 500gm Packet', qty: 3, revenue: 99, cost: 81, profit: 18 }
            ]
          },
          {
            id: 'tx_102',
            timestamp: now - 1800000,
            operatorId: 'u_operator1',
            operatorName: 'Ramesh (Counter Guy)',
            customerName: 'Walk-in Customer',
            paymentMode: 'Cash',
            totalRevenue: 198,
            totalCost: 151.5,
            totalProfit: 46.5,
            items: [
              { productId: 'p_marlboro_ice', productName: 'Marlboro Ice Blast (menthol)', saleModeLabel: '4 Loose Sticks (₹18/stick)', qty: 4, revenue: 72, cost: 62, profit: 10 },
              { productId: 'p_loose_atta', productName: 'Loose MP Sharbati Chakki Atta (Bulk Sack)', saleModeLabel: '2.50 kg Loose (@₹44/kg)', qty: 2.5, revenue: 110, cost: 87.5, profit: 22.5 },
              { productId: 'p_marlboro_ice', productName: 'Marlboro Ice Blast (menthol)', saleModeLabel: '1 Loose Stick', qty: 1, revenue: 18, cost: 15.5, profit: 2.5 }
            ]
          },
          {
            id: 'tx_103',
            timestamp: now - 5 * dayMs,
            operatorId: 'u_operator2',
            operatorName: 'Mohan (Evening Helper)',
            customerName: 'Sujatha Aunty',
            paymentMode: 'Cash',
            totalRevenue: 545,
            totalCost: 465,
            totalProfit: 80,
            items: [
              { productId: 'p_atta_5kg', productName: 'Aashirvaad Shudh Chakki Atta (5kg Pack)', saleModeLabel: '1 x 5kg Family Bag', qty: 1, revenue: 255, cost: 225, profit: 30 },
              { productId: 'p_loose_rice', productName: 'Loose Sona Masoori Steam Rice (Old Crop)', saleModeLabel: '5.00 kg Loose (@₹58/kg)', qty: 5, revenue: 290, cost: 240, profit: 50 }
            ]
          }
        ]
      };
    }

    let state = loadState();
    let posCart = [];
    let hisabChartInstance = null;
    let activeTab = 'dashboard';
    let searchQuery = '';

    // =========================================================================
    // FIREBASE FIRESTORE STATE MANAGEMENT
    // =========================================================================
    let firestoreUid = null;          // set after Firebase Auth
    let firestoreUnsubscribe = null;  // onSnapshot unsubscribe fn
    let saveDebounceTimer = null;

    function getShopDocRef() {
      return doc(db, 'shops', firestoreUid, 'data', 'main');
    }

    // Load state from Firestore (called after sign-in)
    async function loadFromFirestore() {
      try {
        const snap = await getDoc(getShopDocRef());
        if (snap.exists()) {
          const data = snap.data();
          // Migrate: ensure passwords exist on users
          if (Array.isArray(data.users)) {
            data.users = data.users.map(u => ({ ...u, password: u.password || 'pass123' }));
          }
          return data;
        }
      } catch (e) {
        console.warn('Firestore load failed, using localStorage fallback:', e);
      }
      // Fallback: load from localStorage (first-time migration)
      return loadFromLocalStorage();
    }

    function loadFromLocalStorage() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.products)) {
            const defaultPasswords = { 'u_owner': 'owner123', 'u_operator1': 'ramesh123', 'u_operator2': 'mohan123' };
            if (Array.isArray(parsed.users)) {
              parsed.users = parsed.users.map(u => ({ ...u, password: u.password || defaultPasswords[u.id] || 'pass123' }));
            }
            return parsed;
          }
        }
      } catch (e) {}
      return getInitialState();
    }

    function loadState() {
      // Synchronous local load for initial render before Firestore
      return loadFromLocalStorage();
    }

    // Subscribe to real-time Firestore updates
    function subscribeFirestore() {
      if (firestoreUnsubscribe) firestoreUnsubscribe();
      firestoreUnsubscribe = onSnapshot(getShopDocRef(), (snap) => {
        if (snap.exists()) {
          const incoming = snap.data();
          // Only update if changed by another device (skip if this device triggered it)
          state = { ...state, ...incoming };
          renderAll();
        }
      }, (err) => console.warn('Firestore sync error:', err));
    }

    function saveState() {
      // Always save to localStorage as backup
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
      // Debounced Firestore save (avoids hammering on rapid changes)
      if (firestoreUid) {
        clearTimeout(saveDebounceTimer);
        saveDebounceTimer = setTimeout(async () => {
          try {
            await setDoc(getShopDocRef(), state);
          } catch (e) {
            console.warn('Firestore save failed (offline?):', e);
          }
        }, 800);
      }
    }

    function getCurrentUser() {
      return state.users.find(u => u.id === state.activeUserId) || state.users[0];
    }

    function isOwnerView() {
      const user = getCurrentUser();
      return user.role === 'OWNER' && !state.privacyMask;
    }

    function formatINR(num) {
      const n = Number(num) || 0;
      return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 });
    }

    function formatMaskedINR(num) {
      if (!isOwnerView()) return '••••';
      return formatINR(num);
    }

    function showToast(message, type = 'info') {
      const container = document.getElementById('toastContainer');
      if (!container) return;
      const el = document.createElement('div');
      const colorMap = {
        success: 'border-l-4 border-l-emerald-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white',
        warning: 'border-l-4 border-l-amber-500 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white',
        info: 'border-l-4 border-l-[#0F6CBD] bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white'
      };
      el.className = `pointer-events-auto fluent-card p-3.5 shadow-fluent-8 text-xs font-medium flex items-center justify-between gap-3 transition-all ${colorMap[type] || colorMap.info}`;
      el.innerHTML = `<span>${message}</span><button type="button" class="text-neutral-400 hover:text-neutral-700 font-bold">✕</button>`;
      el.querySelector('button').addEventListener('click', () => el.remove());
      container.appendChild(el);
      setTimeout(() => {
        if (el.parentNode) el.remove();
      }, 4000);
    }

    // =========================================================================
    // PRODUCT PROFIT & INVENTORY MATHEMATICS ENGINE
    // =========================================================================
    function computeProductMetrics(p) {
      if (p.type === 'PACKET_LOOSE') {
        const unitCost = p.packetBuyCost / Math.max(1, p.unitsPerPacket);
        const packetProfit = p.packetSellPrice - p.packetBuyCost;
        const packetMarginPct = p.packetBuyCost > 0 ? (packetProfit / p.packetBuyCost) * 100 : 0;
        const singleUnitProfit = p.singleUnitSellPrice - unitCost;
        const singleMarginPct = unitCost > 0 ? (singleUnitProfit / unitCost) * 100 : 0;
        const LooseAllInProfitPerPacket = (p.singleUnitSellPrice * p.unitsPerPacket) - p.packetBuyCost;

        const currentCapitalValue = (p.packetsInStock * p.packetBuyCost) + (p.looseUnitsInStock * unitCost);
        const projectedProfitIfSoldLoose = (p.packetsInStock * LooseAllInProfitPerPacket) + (p.looseUnitsInStock * singleUnitProfit);

        return {
          modelBadge: 'Packet + Single Unit Split',
          unitCost,
          packetProfit,
          packetMarginPct,
          singleUnitProfit,
          singleMarginPct,
          LooseAllInProfitPerPacket,
          currentCapitalValue,
          projectedProfit: projectedProfitIfSoldLoose,
          stockSummary: `${p.packetsInStock} Packets + ${p.looseUnitsInStock} Loose (${p.packetsInStock * p.unitsPerPacket + p.looseUnitsInStock} total units)`,
          buySummary: `${formatMaskedINR(p.packetBuyCost)}/pkt (${formatMaskedINR(unitCost)}/stick)`,
          sellSummary: `Pkt: ${formatINR(p.packetSellPrice)} | Single: ${formatINR(p.singleUnitSellPrice)}`
        };
      } else if (p.type === 'PACKAGED_WEIGHT') {
        const unitProfit = p.sellPricePerUnit - p.buyCostPerUnit;
        const marginPct = p.buyCostPerUnit > 0 ? (unitProfit / p.buyCostPerUnit) * 100 : 0;
        const currentCapitalValue = p.stockQty * p.buyCostPerUnit;
        const projectedProfit = p.stockQty * unitProfit;
        return {
          modelBadge: `Packaged (${p.variantLabel})`,
          unitCost: p.buyCostPerUnit,
          unitProfit,
          marginPct,
          currentCapitalValue,
          projectedProfit,
          stockSummary: `${p.stockQty} x ${p.variantLabel}`,
          buySummary: `${formatMaskedINR(p.buyCostPerUnit)} per ${p.variantLabel}`,
          sellSummary: `${formatINR(p.sellPricePerUnit)} per ${p.variantLabel}`
        };
      } else {
        // LOOSE_BULK
        const profitPerKg = p.sellPricePerKg - p.buyCostPerKg;
        const marginPct = p.buyCostPerKg > 0 ? (profitPerKg / p.buyCostPerKg) * 100 : 0;
        const currentCapitalValue = p.stockKg * p.buyCostPerKg;
        const projectedProfit = p.stockKg * profitPerKg;
        return {
          modelBadge: 'Loose Bulk (Per Kg/Gm)',
          unitCost: p.buyCostPerKg,
          profitPerKg,
          marginPct,
          currentCapitalValue,
          projectedProfit,
          stockSummary: `${Number(p.stockKg).toFixed(2)} Kg (${Math.round(p.stockKg * 1000)} gm)`,
          buySummary: `${formatMaskedINR(p.buyCostPerKg)} / Kg`,
          sellSummary: `${formatINR(p.sellPricePerKg)} / Kg (${formatINR(p.sellPricePerKg / 2)} / 500g)`
        };
      }
    }

    function filterTransactionsByPeriod(period) {
      const now = new Date();
      return state.transactions.filter(tx => {
        const d = new Date(tx.timestamp);
        if (period === 'today') {
          return d.toDateString() === now.toDateString();
        } else if (period === 'month') {
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    // =========================================================================
    // RENDER HEADER, ROLES & PRIVACY BANNER
    // =========================================================================
    function renderHeaderAndRole() {
      const shopTitleEl = document.getElementById('headerShopTitle');
      if (shopTitleEl) {
        shopTitleEl.textContent = `${state.shop.name} • ${state.shop.city} • GST: ${state.shop.gst}`;
      }

      const roleSelect = document.getElementById('roleSelector');
      if (roleSelect) {
        roleSelect.innerHTML = state.users.map(u =>
          `<option value="${u.id}" ${u.id === state.activeUserId ? 'selected' : ''}>${u.name} [${u.role}]</option>`
        ).join('');
      }

      const user = getCurrentUser();
      const banner = document.getElementById('roleStatusBanner');
      const bannerText = document.getElementById('roleBannerText');
      const quickBtn = document.getElementById('btnQuickSwitchRole');
      const dot = document.getElementById('roleBadgeDot');
      const labelPrivacy = document.getElementById('labelPrivacyToggle');

      if (labelPrivacy) {
        labelPrivacy.textContent = isOwnerView() ? 'Margins Visible' : 'Margins Hidden';
      }

      if (user.role === 'OWNER') {
        banner.className = 'bg-[#EBF3FC] dark:bg-blue-950/60 border-b border-blue-200 dark:border-blue-900 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2';
        dot.className = 'w-2 h-2 rounded-full bg-emerald-600 animate-pulse';
        bannerText.innerHTML = `<strong>Owner Full Hisab Mode (${user.name}):</strong> Complete visibility into wholesale investment, packet vs loose unit margins, unsold dead-stock, and operator activity.`;
        quickBtn.textContent = 'Switch to Counter Guy View →';
      } else {
        banner.className = 'bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-900 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2';
        dot.className = 'w-2 h-2 rounded-full bg-amber-500 animate-pulse';
        bannerText.innerHTML = `<strong>Counter Operator Mode (${user.name}):</strong> Operating shop POS billing & stock intake. Owner wholesale costs & net profits are protected; all sales are logged under your name.`;
        quickBtn.textContent = 'Switch back to Owner View →';
      }

      const posAttr = document.getElementById('posOperatorAttribution');
      if (posAttr) {
        posAttr.textContent = `Active Counter Seat: ${user.name}`;
      }
    }

    // =========================================================================
    // RENDER VIEW 1: DASHBOARD
    // =========================================================================
    function renderDashboard() {
      // Calculate overall inventory capital & period metrics
      let currentStockCapital = 0;
      let projectedStockProfit = 0;
      state.products.forEach(p => {
        const m = computeProductMetrics(p);
        currentStockCapital += m.currentCapitalValue;
        projectedStockProfit += m.projectedProfit;
      });

      const allTimeCOGS = state.transactions.reduce((acc, t) => acc + t.totalCost, 0);
      const totalCumulativeInvested = currentStockCapital + allTimeCOGS;

      const periodTxs = filterTransactionsByPeriod(state.activePeriod);
      const periodRev = periodTxs.reduce((acc, t) => acc + t.totalRevenue, 0);
      const periodCost = periodTxs.reduce((acc, t) => acc + t.totalCost, 0);
      const periodProfit = periodTxs.reduce((acc, t) => acc + t.totalProfit, 0);
      const marginPct = periodRev > 0 ? (periodProfit / periodRev) * 100 : 0;

      // Dead stock count (7+ days or never sold)
      const now = Date.now();
      const deadItems = state.products.filter(p => !p.lastSoldAt || (now - p.lastSoldAt) > 7 * 86400000);
      const deadCapital = deadItems.reduce((acc, p) => acc + computeProductMetrics(p).currentCapitalValue, 0);

      document.getElementById('kpiTotalInvested').textContent = formatMaskedINR(totalCumulativeInvested);
      document.getElementById('kpiCurrentStockValue').textContent = formatMaskedINR(currentStockCapital);
      document.getElementById('kpiPeriodRevenue').textContent = formatINR(periodRev);
      document.getElementById('kpiPeriodCOGS').textContent = formatMaskedINR(periodCost);
      document.getElementById('kpiTxCount').textContent = `${periodTxs.length} bill(s)`;
      document.getElementById('kpiPeriodProfit').textContent = isOwnerView() ? `+${formatINR(periodProfit)}` : '••••';
      document.getElementById('kpiProfitMarginPct').textContent = isOwnerView() ? `${marginPct.toFixed(1)}%` : '••%';
      document.getElementById('kpiProjectedStockProfit').textContent = formatMaskedINR(projectedStockProfit);
      document.getElementById('kpiDeadStockValue').textContent = formatMaskedINR(deadCapital);
      document.getElementById('kpiDeadStockItemsLabel').textContent = `${deadItems.length} item(s) slow/unsold`;
      document.getElementById('badgeDeadStockCount').textContent = deadItems.length;

      // Render the 3 Archetype Showcase Cards (1 Packet+Loose, 1 Packaged Weight, 1 Loose Bulk)
      const samplePL = state.products.find(p => p.type === 'PACKET_LOOSE') || state.products[0];
      const samplePW = state.products.find(p => p.type === 'PACKAGED_WEIGHT') || state.products[1];
      const sampleLB = state.products.find(p => p.type === 'LOOSE_BULK') || state.products[3];

      const archetypeGrid = document.getElementById('archetypeCardsGrid');
      if (archetypeGrid) {
        archetypeGrid.innerHTML = [samplePL, samplePW, sampleLB].filter(Boolean).map(p => {
          const m = computeProductMetrics(p);
          if (p.type === 'PACKET_LOOSE') {
            return `
              <div class="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex flex-col justify-between space-y-3">
                <div>
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-[#0F6CBD] text-white">1. Packet + Single Loose</span>
                    <span class="text-xs font-semibold text-neutral-500">${p.packetsInStock} Pkts, ${p.looseUnitsInStock} Loose</span>
                  </div>
                  <h4 class="font-bold text-sm mt-2 text-neutral-900 dark:text-white">${p.name}</h4>
                  <div class="mt-2 space-y-1 text-xs text-neutral-600 dark:text-neutral-300">
                    <div class="flex justify-between"><span>1 Packet Buy Cost (${p.unitsPerPacket} sticks):</span><strong>${formatMaskedINR(p.packetBuyCost)} (${formatMaskedINR(m.unitCost)}/stick)</strong></div>
                    <div class="flex justify-between"><span>Sell Full Packet Price:</span><strong>${formatINR(p.packetSellPrice)} → <span class="text-emerald-700 dark:text-emerald-400">Profit ${formatMaskedINR(m.packetProfit)}</span></strong></div>
                    <div class="flex justify-between"><span>Sell Single Loose Stick:</span><strong>${formatINR(p.singleUnitSellPrice)}/stick → <span class="text-emerald-700 dark:text-emerald-400">Profit ${formatMaskedINR(m.singleUnitProfit)}/stick</span></strong></div>
                    <div class="flex justify-between pt-1 border-t border-blue-200/70 dark:border-blue-800 font-semibold text-[#0F6CBD] dark:text-blue-300">
                      <span>Full Packet Sold as Loose Sticks:</span><span>${formatMaskedINR(m.LooseAllInProfitPerPacket)} profit/pkt!</span>
                    </div>
                  </div>
                </div>
                <button type="button" data-quick-pos="${p.id}" class="fluent-btn-secondary w-full text-xs !py-1.5">Sell Packet or Single Stick →</button>
              </div>`;
          } else if (p.type === 'PACKAGED_WEIGHT') {
            return `
              <div class="p-4 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 flex flex-col justify-between space-y-3">
                <div>
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-600 text-white">2. Packaged Weight (${p.variantLabel})</span>
                    <span class="text-xs font-semibold text-neutral-500">${p.stockQty} Packs Left</span>
                  </div>
                  <h4 class="font-bold text-sm mt-2 text-neutral-900 dark:text-white">${p.name}</h4>
                  <div class="mt-2 space-y-1 text-xs text-neutral-600 dark:text-neutral-300">
                    <div class="flex justify-between"><span>Pack Quantity / Weight:</span><strong>${p.variantLabel}</strong></div>
                    <div class="flex justify-between"><span>Wholesale Buy Cost:</span><strong>${formatMaskedINR(p.buyCostPerUnit)} / pack</strong></div>
                    <div class="flex justify-between"><span>Customer Selling Price:</span><strong>${formatINR(p.sellPricePerUnit)} / pack</strong></div>
                    <div class="flex justify-between pt-1 border-t border-indigo-200/70 dark:border-indigo-800 font-semibold text-emerald-700 dark:text-emerald-400">
                      <span>Net Profit Per Pack:</span><span>+${formatMaskedINR(m.unitProfit)} (${isOwnerView() ? m.marginPct.toFixed(1) + '%' : '••%'})</span>
                    </div>
                  </div>
                </div>
                <button type="button" data-quick-pos="${p.id}" class="fluent-btn-secondary w-full text-xs !py-1.5">Sell ${p.variantLabel} →</button>
              </div>`;
          } else {
            return `
              <div class="p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 flex flex-col justify-between space-y-3">
                <div>
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-700 text-white">3. Loose Bulk Weight (Kg/Gm)</span>
                    <span class="text-xs font-semibold text-neutral-500">${Number(p.stockKg).toFixed(2)} Kg Left</span>
                  </div>
                  <h4 class="font-bold text-sm mt-2 text-neutral-900 dark:text-white">${p.name}</h4>
                  <div class="mt-2 space-y-1 text-xs text-neutral-600 dark:text-neutral-300">
                    <div class="flex justify-between"><span>Wholesale Buy Rate:</span><strong>${formatMaskedINR(p.buyCostPerKg)} / Kg (${formatMaskedINR(p.buyCostPerKg * 50)} per 50kg bag)</strong></div>
                    <div class="flex justify-between"><span>Retail Selling Rate:</span><strong>${formatINR(p.sellPricePerKg)} / Kg (${formatINR(p.sellPricePerKg / 2)} per 500gm)</strong></div>
                    <div class="flex justify-between"><span>Profit on 1 Kg / 500gm:</span><strong class="text-emerald-700 dark:text-emerald-400">+${formatMaskedINR(m.profitPerKg)}/kg | +${formatMaskedINR(m.profitPerKg / 2)}/500g</strong></div>
                    <div class="flex justify-between pt-1 border-t border-emerald-200/70 dark:border-emerald-800 font-semibold text-emerald-800 dark:text-emerald-300">
                      <span>Supports Custom ₹ or Gram Sale:</span><span>e.g. 250g, 750g, or ₹35</span>
                    </div>
                  </div>
                </div>
                <button type="button" data-quick-pos="${p.id}" class="fluent-btn-secondary w-full text-xs !py-1.5">Weigh & Sell Loose →</button>
              </div>`;
          }
        }).join('');
      }

      // Render Audit Feed
      const auditFeed = document.getElementById('dashboardAuditFeed');
      if (auditFeed) {
        if (state.transactions.length === 0) {
          auditFeed.innerHTML = `<div class="text-xs text-neutral-400 py-6 text-center">No sales recorded yet.</div>`;
        } else {
          auditFeed.innerHTML = state.transactions.slice().sort((a, b) => b.timestamp - a.timestamp).map(tx => {
            const dt = new Date(tx.timestamp);
            const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + dt.toLocaleDateString([], { day: 'numeric', month: 'short' });
            const itemsSummary = tx.items.map(i => `${i.productName.split('(')[0].trim()} (${i.saleModeLabel})`).join(', ');
            return `
              <div class="p-2.5 rounded-md bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs space-y-1">
                <div class="flex items-center justify-between">
                  <span class="font-semibold text-[#0F6CBD] dark:text-blue-400">${tx.operatorName}</span>
                  <span class="text-[11px] text-neutral-400">${timeStr}</span>
                </div>
                <p class="text-neutral-700 dark:text-neutral-300 line-clamp-2">${itemsSummary}</p>
                <div class="flex items-center justify-between pt-1 border-t border-neutral-200/60 dark:border-neutral-800">
                  <span class="text-[11px] text-neutral-500">${tx.paymentMode} • ${tx.customerName}</span>
                  <span class="font-bold">Bill: ${formatINR(tx.totalRevenue)} <span class="text-emerald-600 ml-1">(Profit: ${formatMaskedINR(tx.totalProfit)})</span></span>
                </div>
              </div>`;
          }).join('');
        }
      }

      renderChart();
    }

    function renderChart() {
      const ctx = document.getElementById('hisabBarChart');
      if (!ctx || typeof Chart === 'undefined') return;

      const labels = state.products.map(p => p.name.length > 20 ? p.name.slice(0, 20) + '…' : p.name);
      const stockCapData = state.products.map(p => Number(computeProductMetrics(p).currentCapitalValue.toFixed(2)));
      const revenueData = state.products.map(p => {
        let rev = 0;
        state.transactions.forEach(tx => {
          tx.items.forEach(item => {
            if (item.productId === p.id) rev += item.revenue;
          });
        });
        return Number(rev.toFixed(2));
      });
      const profitData = state.products.map(p => {
        let prof = 0;
        state.transactions.forEach(tx => {
          tx.items.forEach(item => {
            if (item.productId === p.id) prof += item.profit;
          });
        });
        return Number(prof.toFixed(2));
      });

      if (hisabChartInstance) {
        hisabChartInstance.destroy();
      }

      hisabChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Stock Capital Invested (₹)',
              data: isOwnerView() ? stockCapData : stockCapData.map(() => 0),
              backgroundColor: 'rgba(15, 108, 189, 0.75)',
              borderRadius: 4
            },
            {
              label: 'Sales Revenue Earned (₹)',
              data: revenueData,
              backgroundColor: 'rgba(92, 46, 145, 0.75)',
              borderRadius: 4
            },
            {
              label: 'Net Profit Gained (₹)',
              data: isOwnerView() ? profitData : profitData.map(() => 0),
              backgroundColor: 'rgba(16, 124, 16, 0.85)',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } }
          },
          scales: {
            y: { beginAtZero: true, ticks: { callback: v => '₹' + v } },
            x: { ticks: { font: { size: 10 } } }
          }
        }
      });
    }

    // =========================================================================
    // RENDER VIEW 2: COUNTER POS & SMART UNIT/WEIGHT BILLING
    // =========================================================================
    function renderPOS() {
      const catFilter = document.getElementById('posCategoryFilter')?.value || 'ALL';
      const grid = document.getElementById('posProductsGrid');
      if (!grid) return;

      const filtered = state.products.filter(p => {
        const matchesCat = catFilter === 'ALL' || p.type === catFilter;
        const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery) || (p.category || '').toLowerCase().includes(searchQuery);
        return matchesCat && matchesSearch;
      });

      grid.innerHTML = filtered.map(p => {
        const m = computeProductMetrics(p);
        let actionButtonsHTML = '';
        if (p.type === 'PACKET_LOOSE') {
          actionButtonsHTML = `
            <div class="grid grid-cols-2 gap-2 mt-3">
              <button type="button" data-pos-quick="${p.id}" data-mode="PACKET" class="fluent-btn-primary !py-1.5 text-xs">
                +1 Full Pkt (${formatINR(p.packetSellPrice)})
              </button>
              <button type="button" data-pos-quick="${p.id}" data-mode="SINGLE" class="fluent-btn-secondary !py-1.5 text-xs border-[#0F6CBD] text-[#0F6CBD]">
                +1 Single Stick (${formatINR(p.singleUnitSellPrice)})
              </button>
            </div>
            <button type="button" data-pos-custom="${p.id}" class="w-full mt-1.5 text-[11px] font-semibold text-neutral-500 hover:text-[#0F6CBD] py-1">
              Custom Quantity (e.g. 3 sticks or 2 packets) →
            </button>`;
        } else if (p.type === 'PACKAGED_WEIGHT') {
          actionButtonsHTML = `
            <div class="grid grid-cols-2 gap-2 mt-3">
              <button type="button" data-pos-quick="${p.id}" data-mode="PACK_1" class="fluent-btn-primary !py-1.5 text-xs">
                +1 (${p.variantLabel}) ${formatINR(p.sellPricePerUnit)}
              </button>
              <button type="button" data-pos-custom="${p.id}" class="fluent-btn-secondary !py-1.5 text-xs">
                Custom Pack Qty →
              </button>
            </div>`;
        } else {
          // LOOSE_BULK
          const price250g = p.sellPricePerKg * 0.25;
          const price500g = p.sellPricePerKg * 0.5;
          actionButtonsHTML = `
            <div class="grid grid-cols-3 gap-1.5 mt-3">
              <button type="button" data-pos-quick="${p.id}" data-mode="KG_0.25" class="fluent-btn-secondary !px-2 !py-1.5 text-[11px]">
                +250gm (${formatINR(price250g)})
              </button>
              <button type="button" data-pos-quick="${p.id}" data-mode="KG_0.5" class="fluent-btn-secondary !px-2 !py-1.5 text-[11px]">
                +500gm (${formatINR(price500g)})
              </button>
              <button type="button" data-pos-quick="${p.id}" data-mode="KG_1" class="fluent-btn-primary !px-2 !py-1.5 text-[11px]">
                +1 Kg (${formatINR(p.sellPricePerKg)})
              </button>
            </div>
            <button type="button" data-pos-custom="${p.id}" class="w-full mt-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline py-1">
              Custom Weight (gm/kg) or Custom ₹ Amount →
            </button>`;
        }

        return `
          <div class="fluent-card fluent-card-interactive p-4 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between gap-2">
                <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">${m.modelBadge}</span>
                <span class="text-xs font-semibold text-emerald-700 dark:text-emerald-400">${m.stockSummary.split('(')[0]}</span>
              </div>
              <h4 class="font-bold text-sm mt-2">${p.name}</h4>
              <p class="text-xs text-neutral-500 mt-0.5">${m.sellSummary}</p>
              ${isOwnerView() ? `<p class="text-[11px] text-neutral-400 mt-0.5">Buy Cost: ${m.buySummary}</p>` : ''}
            </div>
            ${actionButtonsHTML}
          </div>`;
      }).join('');

      renderCart();
    }

    function addToPosCart(productId, mode, customVal = 1) {
      const p = state.products.find(x => x.id === productId);
      if (!p) return;

      let itemEntry = null;
      if (p.type === 'PACKET_LOOSE') {
        const unitCost = p.packetBuyCost / Math.max(1, p.unitsPerPacket);
        if (mode === 'PACKET') {
          const qty = Math.max(1, Math.round(customVal));
          itemEntry = {
            cartId: 'c_' + Date.now() + Math.random(),
            productId: p.id,
            productName: p.name,
            subMode: 'PACKET',
            qty,
            saleModeLabel: `${qty} Full Packet(s)`,
            revenue: qty * p.packetSellPrice,
            cost: qty * p.packetBuyCost,
            profit: qty * (p.packetSellPrice - p.packetBuyCost)
          };
        } else {
          const qty = Math.max(1, Math.round(customVal));
          itemEntry = {
            cartId: 'c_' + Date.now() + Math.random(),
            productId: p.id,
            productName: p.name,
            subMode: 'SINGLE',
            qty,
            saleModeLabel: `${qty} Loose Stick(s)/Unit(s)`,
            revenue: qty * p.singleUnitSellPrice,
            cost: qty * unitCost,
            profit: qty * (p.singleUnitSellPrice - unitCost)
          };
        }
      } else if (p.type === 'PACKAGED_WEIGHT') {
        const qty = Math.max(1, Math.round(customVal));
        itemEntry = {
          cartId: 'c_' + Date.now() + Math.random(),
          productId: p.id,
          productName: p.name,
          subMode: 'PACK',
          qty,
          saleModeLabel: `${qty} x ${p.variantLabel}`,
          revenue: qty * p.sellPricePerUnit,
          cost: qty * p.buyCostPerUnit,
          profit: qty * (p.sellPricePerUnit - p.buyCostPerUnit)
        };
      } else if (p.type === 'LOOSE_BULK') {
        // customVal is weight in Kg
        const weightKg = Math.max(0.01, Number(customVal));
        const labelWeight = weightKg < 1 ? `${Math.round(weightKg * 1000)} gm Loose` : `${weightKg.toFixed(2)} Kg Loose`;
        const revenue = weightKg * p.sellPricePerKg;
        const cost = weightKg * p.buyCostPerKg;
        itemEntry = {
          cartId: 'c_' + Date.now() + Math.random(),
          productId: p.id,
          productName: p.name,
          subMode: 'LOOSE_KG',
          qty: weightKg,
          saleModeLabel: `${labelWeight} (@₹${p.sellPricePerKg}/kg)`,
          revenue,
          cost,
          profit: revenue - cost
        };
      }

      if (itemEntry) {
        posCart.push(itemEntry);
        renderCart();
        showToast(`Added ${itemEntry.saleModeLabel} of ${p.name}`, 'info');
      }
    }

    function openCustomPosModal(productId) {
      const p = state.products.find(x => x.id === productId);
      if (!p) return;
      const modal = document.getElementById('modalPosItemConfig');
      const title = document.getElementById('posModalProductName');
      const sub = document.getElementById('posModalProductSub');
      const body = document.getElementById('posModalBody');

      title.textContent = p.name;
      const m = computeProductMetrics(p);
      sub.textContent = `Available Stock: ${m.stockSummary}`;

      if (p.type === 'PACKET_LOOSE') {
        body.innerHTML = `
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-semibold mb-1">Sell Mode</label>
              <select id="customPosPLMode" class="fluent-input text-xs">
                <option value="SINGLE">Sell Single Loose Stick/Unit (₹${p.singleUnitSellPrice} each)</option>
                <option value="PACKET">Sell Full Sealed Packet (₹${p.packetSellPrice} per packet)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1">Quantity to Sell</label>
              <input id="customPosPLQty" type="number" min="1" step="1" value="2" class="fluent-input" />
            </div>
            <button id="btnConfirmCustomPosPL" type="button" class="fluent-btn-primary w-full">Add to Customer Bill</button>
          </div>`;
        document.getElementById('btnConfirmCustomPosPL').addEventListener('click', () => {
          const mode = document.getElementById('customPosPLMode').value;
          const qty = Number(document.getElementById('customPosPLQty').value) || 1;
          addToPosCart(p.id, mode, qty);
          modal.classList.add('hidden');
        });
      } else if (p.type === 'PACKAGED_WEIGHT') {
        body.innerHTML = `
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-semibold mb-1">Number of ${p.variantLabel}s</label>
              <input id="customPosPWQty" type="number" min="1" step="1" value="2" class="fluent-input" />
            </div>
            <button id="btnConfirmCustomPosPW" type="button" class="fluent-btn-primary w-full">Add to Customer Bill</button>
          </div>`;
        document.getElementById('btnConfirmCustomPosPW').addEventListener('click', () => {
          const qty = Number(document.getElementById('customPosPWQty').value) || 1;
          addToPosCart(p.id, 'PACK', qty);
          modal.classList.add('hidden');
        });
      } else {
        // LOOSE_BULK custom weight in grams, kg, OR custom rupee value
        body.innerHTML = `
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-semibold mb-1">Enter Weight in Grams (gm)</label>
                <input id="customPosLBGrams" type="number" min="10" step="10" value="500" class="fluent-input" />
              </div>
              <div>
                <label class="block text-xs font-semibold mb-1">OR By Customer ₹ Price</label>
                <input id="customPosLBRupees" type="number" min="1" step="1" value="${(p.sellPricePerKg * 0.5).toFixed(0)}" class="fluent-input" />
              </div>
            </div>
            <p id="customPosLBPreview" class="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
              500 gm = ${formatINR(p.sellPricePerKg * 0.5)} (Profit: ${formatMaskedINR((p.sellPricePerKg - p.buyCostPerKg) * 0.5)})
            </p>
            <button id="btnConfirmCustomPosLB" type="button" class="fluent-btn-primary w-full">Add Weighed Loose Item to Bill</button>
          </div>`;

        const gInput = document.getElementById('customPosLBGrams');
        const rInput = document.getElementById('customPosLBRupees');
        const prev = document.getElementById('customPosLBPreview');

        gInput.addEventListener('input', () => {
          const kg = (Number(gInput.value) || 0) / 1000;
          const rev = kg * p.sellPricePerKg;
          const prof = kg * (p.sellPricePerKg - p.buyCostPerKg);
          rInput.value = rev.toFixed(1);
          prev.textContent = `${gInput.value} gm (${kg.toFixed(3)} kg) = ${formatINR(rev)} (Profit: ${formatMaskedINR(prof)})`;
        });

        rInput.addEventListener('input', () => {
          const rev = Number(rInput.value) || 0;
          const kg = p.sellPricePerKg > 0 ? rev / p.sellPricePerKg : 0;
          const prof = kg * (p.sellPricePerKg - p.buyCostPerKg);
          gInput.value = Math.round(kg * 1000);
          prev.textContent = `For ₹${rev}, give ${Math.round(kg * 1000)} gm (${kg.toFixed(3)} kg) • Profit: ${formatMaskedINR(prof)}`;
        });

        document.getElementById('btnConfirmCustomPosLB').addEventListener('click', () => {
          const kg = (Number(gInput.value) || 100) / 1000;
          addToPosCart(p.id, 'LOOSE_KG', kg);
          modal.classList.add('hidden');
        });
      }

      modal.classList.remove('hidden');
    }

    function renderCart() {
      const list = document.getElementById('posCartItemsList');
      if (!list) return;

      if (posCart.length === 0) {
        list.innerHTML = `<div class="py-8 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg">Tap any product on the left to add to the customer bill.</div>`;
      } else {
        list.innerHTML = posCart.map(item => `
          <div class="p-2.5 rounded bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2 text-xs">
            <div class="min-w-0">
              <div class="font-semibold truncate">${item.productName}</div>
              <div class="text-[11px] text-neutral-500">${item.saleModeLabel} ${isOwnerView() ? `• <span class="text-emerald-600">Profit +${formatINR(item.profit)}</span>` : ''}</div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="font-bold">${formatINR(item.revenue)}</span>
              <button type="button" data-remove-cart="${item.cartId}" class="text-neutral-400 hover:text-red-600 font-bold px-1">✕</button>
            </div>
          </div>
        `).join('');
      }

      const totalCost = posCart.reduce((a, b) => a + b.cost, 0);
      const totalProfit = posCart.reduce((a, b) => a + b.profit, 0);
      const totalPayable = posCart.reduce((a, b) => a + b.revenue, 0);

      document.getElementById('cartTotalCost').textContent = formatMaskedINR(totalCost);
      document.getElementById('cartTotalProfit').textContent = isOwnerView() ? `+${formatINR(totalProfit)}` : '••••';
      document.getElementById('cartTotalPayable').textContent = formatINR(totalPayable);
    }

    function completePosSale() {
      if (posCart.length === 0) {
        showToast('Please add at least one product to the customer bill first.', 'warning');
        return;
      }

      const now = Date.now();
      // Deduct inventory accurately for each item
      posCart.forEach(item => {
        const p = state.products.find(x => x.id === item.productId);
        if (!p) return;
        p.lastSoldAt = now;

        if (p.type === 'PACKET_LOOSE') {
          if (item.subMode === 'PACKET') {
            p.packetsInStock = Math.max(0, p.packetsInStock - item.qty);
          } else {
            // Selling loose sticks: auto break a full packet if looseUnitsInStock is insufficient!
            let needed = item.qty;
            while (p.looseUnitsInStock < needed && p.packetsInStock > 0) {
              p.packetsInStock -= 1;
              p.looseUnitsInStock += p.unitsPerPacket;
            }
            p.looseUnitsInStock = Math.max(0, p.looseUnitsInStock - needed);
          }
        } else if (p.type === 'PACKAGED_WEIGHT') {
          p.stockQty = Math.max(0, p.stockQty - item.qty);
        } else if (p.type === 'LOOSE_BULK') {
          p.stockKg = Math.max(0, Number((p.stockKg - item.qty).toFixed(3)));
        }
      });

      const user = getCurrentUser();
      const customerName = document.getElementById('posCustomerName')?.value.trim() || 'Walk-in Customer';
      const paymentMode = document.getElementById('posPaymentMode')?.value || 'Cash';

      const totalRevenue = posCart.reduce((a, b) => a + b.revenue, 0);
      const totalCost = posCart.reduce((a, b) => a + b.cost, 0);
      const totalProfit = posCart.reduce((a, b) => a + b.profit, 0);

      state.transactions.unshift({
        id: 'tx_' + now,
        timestamp: now,
        operatorId: user.id,
        operatorName: user.name,
        customerName,
        paymentMode,
        totalRevenue,
        totalCost,
        totalProfit,
        items: posCart.slice()
      });

      // Record sale to Firestore sales sub-collection
      if (firestoreUid) {
        const salesCol = collection(db, 'shops', firestoreUid, 'sales');
        addDoc(salesCol, {
          timestamp: new Date().toISOString(),
          operatorId: user.id,
          operatorName: user.name,
          customerName,
          paymentMode,
          totalRevenue,
          totalCost,
          totalProfit,
          items: posCart.slice()
        }).catch(err => console.warn('Sale record failed:', err));
      }

      posCart = [];
      document.getElementById('posCustomerName').value = '';
      saveState();
      renderAll();
      showToast(`Sale of ${formatINR(totalRevenue)} recorded by ${user.name}! ✅`, 'success');
    }

    // =========================================================================
    // RENDER VIEW 3: INVENTORY TABLE
    // =========================================================================
    function renderInventoryTable() {
      const tbody = document.getElementById('inventoryTableBody');
      if (!tbody) return;

      const filtered = state.products.filter(p =>
        !searchQuery || p.name.toLowerCase().includes(searchQuery) || (p.category || '').toLowerCase().includes(searchQuery)
      );

      tbody.innerHTML = filtered.map(p => {
        const m = computeProductMetrics(p);
        let realizedProfit = 0;
        let realizedRevenue = 0;
        state.transactions.forEach(tx => {
          tx.items.forEach(i => {
            if (i.productId === p.id) {
              realizedProfit += i.profit;
              realizedRevenue += i.revenue;
            }
          });
        });

        let marginPill = '';
        if (p.type === 'PACKET_LOOSE') {
          marginPill = `Pkt: +${formatMaskedINR(m.packetProfit)} | Stick: +${formatMaskedINR(m.singleUnitProfit)}`;
        } else if (p.type === 'PACKAGED_WEIGHT') {
          marginPill = `+${formatMaskedINR(m.unitProfit)} / pack`;
        } else {
          marginPill = `+${formatMaskedINR(m.profitPerKg)} / Kg`;
        }

        return `
          <tr class="hover:bg-neutral-50/80 dark:hover:bg-neutral-900/40 transition">
            <td class="py-3 px-3">
              <div class="font-bold text-neutral-900 dark:text-white">${p.name}</div>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-[#0F6CBD] dark:text-blue-300">${m.modelBadge}</span>
                <span class="text-xs text-neutral-400">${p.category || 'General'}</span>
              </div>
            </td>
            <td class="py-3 px-3 text-xs font-medium">${m.buySummary}</td>
            <td class="py-3 px-3">
              <div class="text-xs font-semibold">${m.sellSummary}</div>
              <div class="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">${marginPill}</div>
            </td>
            <td class="py-3 px-3 text-xs font-semibold">${m.stockSummary}</td>
            <td class="py-3 px-3 text-right font-semibold text-xs">${formatMaskedINR(m.currentCapitalValue)}</td>
            <td class="py-3 px-3 text-right">
              <div class="font-bold text-emerald-700 dark:text-emerald-400 text-xs">${formatMaskedINR(realizedProfit)}</div>
              <div class="text-[10px] text-neutral-400">Sales: ${formatINR(realizedRevenue)}</div>
            </td>
            <td class="py-3 px-3 text-center">
              <div class="inline-flex items-center gap-1">
                <button type="button" data-edit-prod="${p.id}" class="px-2 py-1 text-xs rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800">Edit</button>
                <button type="button" data-quick-pos="${p.id}" class="px-2 py-1 text-xs rounded bg-[#EBF3FC] text-[#0F6CBD] font-semibold hover:bg-blue-100">Sell</button>
              </div>
            </td>
          </tr>`;
      }).join('');
    }

    // =========================================================================
    // RENDER VIEW 4: DEAD-STOCK / UNSOLD RADAR
    // =========================================================================
    function renderDeadStock() {
      const daysThreshold = Number(document.getElementById('deadStockThresholdSelect')?.value ?? 7);
      const container = document.getElementById('deadStockCardsContainer');
      if (!container) return;

      const now = Date.now();
      const flagged = state.products.filter(p => {
        if (!p.lastSoldAt) return true;
        const daysSince = (now - p.lastSoldAt) / 86400000;
        if (daysThreshold === 0) {
          return new Date(p.lastSoldAt).toDateString() !== new Date(now).toDateString();
        }
        return daysSince >= daysThreshold;
      });

      if (flagged.length === 0) {
        container.innerHTML = `<div class="col-span-full p-8 text-center text-sm text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200">Great news! All products have been actively selling within this window.</div>`;
        return;
      }

      container.innerHTML = flagged.map(p => {
        const m = computeProductMetrics(p);
        const daysAgo = p.lastSoldAt ? Math.floor((now - p.lastSoldAt) / 86400000) : null;
        const statusBadge = daysAgo === null
          ? `<span class="px-2 py-0.5 text-[11px] font-bold rounded bg-red-100 text-red-800">Never Sold (0 Sales)</span>`
          : `<span class="px-2 py-0.5 text-[11px] font-bold rounded bg-amber-100 text-amber-800">Last Sold ${daysAgo} day(s) ago</span>`;

        return `
          <div class="fluent-card p-4 border-t-4 border-t-amber-500 flex flex-col justify-between space-y-3">
            <div>
              <div class="flex items-center justify-between gap-2">
                ${statusBadge}
                <span class="text-xs font-bold text-amber-700">Stuck: ${formatMaskedINR(m.currentCapitalValue)}</span>
              </div>
              <h4 class="font-bold text-sm mt-2">${p.name}</h4>
              <p class="text-xs text-neutral-500 mt-1">Stock Sitting Idle: <strong>${m.stockSummary}</strong></p>
              <p class="text-xs text-neutral-500">Current Selling Price: ${m.sellSummary}</p>
            </div>
            <div class="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2">
              <button type="button" data-discount-promo="${p.id}" class="fluent-btn-secondary text-xs !py-1 flex-1">Apply 5% Clearance</button>
              <button type="button" data-quick-pos="${p.id}" class="fluent-btn-primary text-xs !py-1 flex-1">Push Counter Sale</button>
            </div>
          </div>`;
      }).join('');
    }

    // =========================================================================
    // RENDER VIEW 5: SHOP ACCOUNT & STAFF ACCESS
    // =========================================================================
    function renderStaffAndAccount() {
      document.getElementById('inputShopName').value = state.shop.name || '';
      document.getElementById('inputOwnerName').value = state.shop.owner || '';
      document.getElementById('inputShopPhone').value = state.shop.phone || '';
      document.getElementById('inputShopGST').value = state.shop.gst || '';
      document.getElementById('inputShopCity').value = state.shop.city || '';

      const staffList = document.getElementById('staffMembersList');
      if (!staffList) return;

      staffList.innerHTML = state.users.map(u => {
        const isCurrent = u.id === state.activeUserId;
        const txCount = state.transactions.filter(t => t.operatorId === u.id).length;
        return `
          <div class="p-3 rounded-lg border ${isCurrent ? 'border-[#0F6CBD] bg-blue-50/40 dark:bg-blue-950/30' : 'border-neutral-200 dark:border-neutral-800'} flex items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-sm">${u.name}</span>
                <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded ${u.role === 'OWNER' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">${u.role}</span>
                ${isCurrent ? '<span class="text-[10px] font-semibold text-[#0F6CBD]">(Active Now)</span>' : ''}
              </div>
              <p class="text-xs text-neutral-500 mt-0.5">${u.badge} • Bills Logged: <strong>${txCount}</strong></p>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" data-switch-user="${u.id}" class="fluent-btn-secondary !py-1 !px-2.5 text-xs">
                ${isCurrent ? 'Selected' : 'Switch to Seat'}
              </button>
            </div>
          </div>`;
      }).join('');
    }

    // =========================================================================
    // MODAL: LIVE PROFIT CALCULATOR & PRODUCT SAVE
    // =========================================================================
    function getSelectedProdType() {
      const checked = document.querySelector('input[name="prodType"]:checked');
      return checked ? checked.value : 'PACKET_LOOSE';
    }

    function updateModalFieldsVisibility() {
      const t = getSelectedProdType();
      document.getElementById('fieldsPacketLoose').classList.toggle('hidden', t !== 'PACKET_LOOSE');
      document.getElementById('fieldsPackagedWeight').classList.toggle('hidden', t !== 'PACKAGED_WEIGHT');
      document.getElementById('fieldsLooseBulk').classList.toggle('hidden', t !== 'LOOSE_BULK');
      updateModalProfitPreview();
    }

    function updateModalProfitPreview() {
      const t = getSelectedProdType();
      const previewEl = document.getElementById('modalLiveProfitPreview');
      if (!previewEl) return;

      if (t === 'PACKET_LOOSE') {
        const pkts = Number(document.getElementById('plPacketsCount').value) || 0;
        const unitsPerPkt = Math.max(1, Number(document.getElementById('plUnitsPerPacket').value) || 1);
        const loose = Number(document.getElementById('plLooseCount').value) || 0;
        const buyPkt = Number(document.getElementById('plPacketBuyCost').value) || 0;
        const sellPkt = Number(document.getElementById('plPacketSellPrice').value) || 0;
        const sellSingle = Number(document.getElementById('plSingleSellPrice').value) || 0;

        const costPerStick = buyPkt / unitsPerPkt;
        const pktProfit = sellPkt - buyPkt;
        const singleProfit = sellSingle - costPerStick;
        const allLoosePktProfit = (sellSingle * unitsPerPkt) - buyPkt;
        const totalInvested = (pkts * buyPkt) + (loose * costPerStick);

        previewEl.innerHTML = `
          <div class="font-bold text-[#0F6CBD] mb-1">Automatic Dual-Margin Hisab Preview:</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-1">
            <div>• Total Investment Now: <strong>${formatINR(totalInvested)}</strong></div>
            <div>• 1 Single Stick Effective Cost: <strong>${formatINR(costPerStick)}</strong></div>
            <div>• Profit if sold as Full Packet: <strong class="text-emerald-700">+${formatINR(pktProfit)} / packet</strong></div>
            <div>• Profit if sold as Single Stick: <strong class="text-emerald-700">+${formatINR(singleProfit)} / stick (${formatINR(allLoosePktProfit)} per packet!)</strong></div>
          </div>`;
      } else if (t === 'PACKAGED_WEIGHT') {
        const label = document.getElementById('pwVariantLabel').value || 'Packet';
        const qty = Number(document.getElementById('pwStockQty').value) || 0;
        const buy = Number(document.getElementById('pwBuyCost').value) || 0;
        const sell = Number(document.getElementById('pwSellPrice').value) || 0;
        const profit = sell - buy;
        previewEl.innerHTML = `
          <div class="font-bold text-indigo-700 mb-1">Automatic Packaged Weight Hisab Preview:</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-1">
            <div>• Total Investment (${qty} x ${label}): <strong>${formatINR(qty * buy)}</strong></div>
            <div>• Profit per ${label}: <strong class="text-emerald-700">+${formatINR(profit)} (Total Projected: +${formatINR(qty * profit)})</strong></div>
          </div>`;
      } else {
        const kg = Number(document.getElementById('lbTotalKg').value) || 0;
        const buyKg = Number(document.getElementById('lbBuyCostPerKg').value) || 0;
        const sellKg = Number(document.getElementById('lbSellPricePerKg').value) || 0;
        const profitKg = sellKg - buyKg;
        previewEl.innerHTML = `
          <div class="font-bold text-emerald-800 mb-1">Automatic Loose Bulk Commodity Preview:</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-1">
            <div>• Total Bulk Investment (${kg} Kg): <strong>${formatINR(kg * buyKg)}</strong></div>
            <div>• Profit per 1 Kg: <strong class="text-emerald-700">+${formatINR(profitKg)}/kg (+${formatINR(profitKg / 2)} per 500gm)</strong></div>
            <div>• Total Projected Profit on ${kg} Kg: <strong class="text-emerald-700">+${formatINR(kg * profitKg)}</strong></div>
          </div>`;
      }
    }

    function openProductModal(editProductId = null) {
      const modal = document.getElementById('modalAddProduct');
      const title = document.getElementById('modalProductTitle');
      document.getElementById('prodEditId').value = editProductId || '';

      if (editProductId) {
        const p = state.products.find(x => x.id === editProductId);
        if (!p) return;
        title.textContent = `Edit Product: ${p.name}`;
        document.getElementById('prodNameInput').value = p.name;
        document.getElementById('prodCategoryInput').value = p.category || '';
        const radio = document.querySelector(`input[name="prodType"][value="${p.type}"]`);
        if (radio) radio.checked = true;

        if (p.type === 'PACKET_LOOSE') {
          document.getElementById('plPacketsCount').value = p.packetsInStock;
          document.getElementById('plUnitsPerPacket').value = p.unitsPerPacket;
          document.getElementById('plLooseCount').value = p.looseUnitsInStock;
          document.getElementById('plPacketBuyCost').value = p.packetBuyCost;
          document.getElementById('plPacketSellPrice').value = p.packetSellPrice;
          document.getElementById('plSingleSellPrice').value = p.singleUnitSellPrice;
        } else if (p.type === 'PACKAGED_WEIGHT') {
          document.getElementById('pwVariantLabel').value = p.variantLabel;
          document.getElementById('pwStockQty').value = p.stockQty;
          document.getElementById('pwBuyCost').value = p.buyCostPerUnit;
          document.getElementById('pwSellPrice').value = p.sellPricePerUnit;
        } else {
          document.getElementById('lbTotalKg').value = p.stockKg;
          document.getElementById('lbBuyCostPerKg').value = p.buyCostPerKg;
          document.getElementById('lbSellPricePerKg').value = p.sellPricePerKg;
        }
      } else {
        title.textContent = 'Add New Product to Shop Inventory';
        document.getElementById('prodNameInput').value = '';
        document.getElementById('prodCategoryInput').value = '';
      }

      updateModalFieldsVisibility();
      modal.classList.remove('hidden');
    }

    // =========================================================================
    // NAVIGATION & TAB SWITCHING
    // =========================================================================
    function switchTab(tabId) {
      activeTab = tabId;
      const views = ['dashboard', 'pos', 'inventory', 'deadstock', 'staff'];
      views.forEach(v => {
        const el = document.getElementById('view-' + v);
        if (el) el.classList.toggle('hidden', v !== tabId);
      });

      document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
      });

      document.getElementById('mobileNavDrawer')?.classList.add('hidden');
      renderAll();
    }

    function renderAll() {
      renderHeaderAndRole();
      renderDashboard();
      renderPOS();
      renderInventoryTable();
      renderDeadStock();
      renderStaffAndAccount();
    }

    // =========================================================================
    // EVENT LISTENERS INITIALIZATION
    // =========================================================================
    window.addEventListener('DOMContentLoaded', () => {
      // Live Clock
      const updateClock = () => {
        const el = document.getElementById('liveClockDisplay');
        if (el) el.textContent = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
      };
      updateClock();
      setInterval(updateClock, 30000);

      // Navigation Tabs
      document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
      });

      document.querySelectorAll('[data-goto-tab]').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.getAttribute('data-goto-tab')));
      });

      // Mobile Drawer
      document.getElementById('btnMobileNavToggle')?.addEventListener('click', () => {
        document.getElementById('mobileNavDrawer')?.classList.remove('hidden');
      });
      document.getElementById('btnCloseMobileNav')?.addEventListener('click', () => {
        document.getElementById('mobileNavDrawer')?.classList.add('hidden');
      });

      // Role Selector & Quick Switch
      document.getElementById('roleSelector')?.addEventListener('change', (e) => {
        state.activeUserId = e.target.value;
        saveState();
        renderAll();
        showToast(`Switched active seat to ${getCurrentUser().name}`, 'info');
      });

      document.getElementById('btnQuickSwitchRole')?.addEventListener('click', () => {
        const current = getCurrentUser();
        if (current.role === 'OWNER') {
          const op = state.users.find(u => u.role === 'OPERATOR') || state.users[0];
          state.activeUserId = op.id;
        } else {
          const own = state.users.find(u => u.role === 'OWNER') || state.users[0];
          state.activeUserId = own.id;
        }
        saveState();
        renderAll();
        showToast(`Switched active seat to ${getCurrentUser().name}`, 'info');
      });

      // Privacy Toggle
      document.getElementById('btnTogglePrivacy')?.addEventListener('click', () => {
        state.privacyMask = !state.privacyMask;
        saveState();
        renderAll();
      });

      // Dark Mode
      document.getElementById('btnToggleDark')?.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
      });

      // Sign Out
      document.getElementById('btnSignOut')?.addEventListener('click', async () => {
        if (firestoreUnsubscribe) firestoreUnsubscribe();
        await signOut(auth);
        firestoreUid = null;
        showLoginScreen();
      });


      // Global Search
      document.getElementById('globalSearchInput')?.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        renderPOS();
        renderInventoryTable();
      });

      // Period Filter Buttons
      document.querySelectorAll('.period-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.activePeriod = btn.getAttribute('data-period');
          document.querySelectorAll('.period-filter-btn').forEach(b => {
            const active = b.getAttribute('data-period') === state.activePeriod;
            b.className = active
              ? 'period-filter-btn px-3 py-1 text-xs font-semibold rounded bg-white dark:bg-neutral-900 text-[#0F6CBD] shadow-sm'
              : 'period-filter-btn px-3 py-1 text-xs font-semibold rounded text-neutral-600 dark:text-neutral-300';
          });
          saveState();
          renderDashboard();
        });
      });

      // Command Bar Buttons
      document.getElementById('btnCommandAddProduct')?.addEventListener('click', () => openProductModal());
      document.getElementById('btnOpenAddProductModalSidebar')?.addEventListener('click', () => openProductModal());
      document.getElementById('btnOpenAddProductModalInventory')?.addEventListener('click', () => openProductModal());
      document.getElementById('btnCommandQuickSale')?.addEventListener('click', () => switchTab('pos'));

      // Export CSV
      document.getElementById('btnCommandExportCSV')?.addEventListener('click', () => {
        const rows = [['Product Name', 'Type', 'Category', 'Stock Summary', 'Capital Value (INR)']];
        state.products.forEach(p => {
          const m = computeProductMetrics(p);
          rows.push([`"${p.name}"`, p.type, `"${p.category || ''}"`, `"${m.stockSummary}"`, m.currentCapitalValue.toFixed(2)]);
        });
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'kirana_hishab_report.csv';
        a.click();
        showToast('Exported Kirana-Hishab CSV report!', 'success');
      });

      // Reset Demo Data
      document.getElementById('btnResetDemoData')?.addEventListener('click', () => {
        state = getInitialState();
        posCart = [];
        saveState();
        renderAll();
        showToast('Demo Kirana store data restored to defaults.', 'info');
      });

      // Product Modal Controls
      document.getElementById('btnCloseProductModal')?.addEventListener('click', () => {
        document.getElementById('modalAddProduct').classList.add('hidden');
      });
      document.getElementById('btnCancelProductModal')?.addEventListener('click', () => {
        document.getElementById('modalAddProduct').classList.add('hidden');
      });
      document.querySelectorAll('input[name="prodType"]').forEach(r => {
        r.addEventListener('change', updateModalFieldsVisibility);
      });
      document.querySelectorAll('.calc-trigger').forEach(inp => {
        inp.addEventListener('input', updateModalProfitPreview);
      });

      document.getElementById('formAddProduct')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = document.getElementById('prodEditId').value;
        const type = getSelectedProdType();
        const name = document.getElementById('prodNameInput').value.trim();
        const category = document.getElementById('prodCategoryInput').value.trim() || 'General Kirana';

        let prodData = {
          id: editId || ('p_' + Date.now()),
          name,
          category,
          type,
          createdAt: Date.now(),
          lastSoldAt: editId ? (state.products.find(x => x.id === editId)?.lastSoldAt || null) : null
        };

        if (type === 'PACKET_LOOSE') {
          prodData.packetsInStock = Number(document.getElementById('plPacketsCount').value) || 0;
          prodData.unitsPerPacket = Math.max(1, Number(document.getElementById('plUnitsPerPacket').value) || 1);
          prodData.looseUnitsInStock = Number(document.getElementById('plLooseCount').value) || 0;
          prodData.packetBuyCost = Number(document.getElementById('plPacketBuyCost').value) || 0;
          prodData.packetSellPrice = Number(document.getElementById('plPacketSellPrice').value) || 0;
          prodData.singleUnitSellPrice = Number(document.getElementById('plSingleSellPrice').value) || 0;
        } else if (type === 'PACKAGED_WEIGHT') {
          prodData.variantLabel = document.getElementById('pwVariantLabel').value.trim() || '1 Packet';
          prodData.stockQty = Number(document.getElementById('pwStockQty').value) || 0;
          prodData.buyCostPerUnit = Number(document.getElementById('pwBuyCost').value) || 0;
          prodData.sellPricePerUnit = Number(document.getElementById('pwSellPrice').value) || 0;
        } else {
          prodData.stockKg = Number(document.getElementById('lbTotalKg').value) || 0;
          prodData.buyCostPerKg = Number(document.getElementById('lbBuyCostPerKg').value) || 0;
          prodData.sellPricePerKg = Number(document.getElementById('lbSellPricePerKg').value) || 0;
        }

        if (editId) {
          const idx = state.products.findIndex(x => x.id === editId);
          if (idx >= 0) state.products[idx] = prodData;
        } else {
          state.products.unshift(prodData);
        }

        saveState();
        document.getElementById('modalAddProduct').classList.add('hidden');
        renderAll();
        showToast(`Saved "${name}" to shop inventory!`, 'success');
      });

      // POS Controls & Event Delegation
      document.getElementById('posCategoryFilter')?.addEventListener('change', renderPOS);
      document.getElementById('btnClearCart')?.addEventListener('click', () => {
        posCart = [];
        renderCart();
      });
      document.getElementById('btnCompleteSale')?.addEventListener('click', completePosSale);
      document.getElementById('btnClosePosConfigModal')?.addEventListener('click', () => {
        document.getElementById('modalPosItemConfig').classList.add('hidden');
      });

      // Dead-stock filter
      document.getElementById('deadStockThresholdSelect')?.addEventListener('change', renderDeadStock);

      // Shop Profile Save
      document.getElementById('shopProfileForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        state.shop.name = document.getElementById('inputShopName').value.trim();
        state.shop.owner = document.getElementById('inputOwnerName').value.trim();
        state.shop.phone = document.getElementById('inputShopPhone').value.trim();
        state.shop.gst = document.getElementById('inputShopGST').value.trim();
        state.shop.city = document.getElementById('inputShopCity').value.trim();
        saveState();
        renderHeaderAndRole();
        showToast('Shop account profile updated!', 'success');
      });

      // Add Staff / Co-Owner account (creates Firebase Auth user)
      document.getElementById('addStaffForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('inputStaffName').value.trim();
        const email = document.getElementById('inputStaffPassword').value.trim(); // re-used as email field
        const role = document.getElementById('inputStaffRole').value;
        if (!name || !email) return;
        const badgeMap = {
          OPERATOR: 'Counter POS & Stock Entry',
          MANAGER: 'Store Manager & Price Control',
          OWNER: 'Co-Owner Full Profit Admin'
        };
        // Note: createUserWithEmailAndPassword signs in the new user.
        // We save state first, then let the new user log in on their own device.
        showToast(`Creating account for ${name}…`, 'info');
        state.users.push({
          id: 'u_' + Date.now(),
          name,
          role,
          badge: badgeMap[role] || 'Counter Staff',
          active: true,
          email
        });
        document.getElementById('inputStaffName').value = '';
        document.getElementById('inputStaffPassword').value = '';
        saveState();
        renderAll();
        showToast(`✅ Access granted to ${name}. They can log in with: ${email}`, 'success');
      });

      // =========================================================================
      // FIREBASE AUTH — Login Screen Logic
      // =========================================================================
      function showLoginScreen(errorMsg) {
        const overlay = document.getElementById('loginOverlay');
        if (overlay) overlay.style.display = '';
        // Reset login button
        const btn = document.getElementById('btnLogin');
        if (btn) { btn.textContent = 'Sign In to Shop Dashboard'; btn.disabled = false; }
        const errEl = document.getElementById('loginError');
        if (errEl) {
          if (errorMsg) { errEl.textContent = errorMsg; errEl.classList.remove('hidden'); }
          else errEl.classList.add('hidden');
        }
        const pwEl = document.getElementById('loginPassword');
        if (pwEl) pwEl.value = '';
      }

      function hideLoginScreen() {
        const overlay = document.getElementById('loginOverlay');
        if (overlay) overlay.style.display = 'none';
      }

      // Login form submit → Firebase Auth
      document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const btn = document.getElementById('btnLogin');
        btn.textContent = 'Signing in…';
        btn.disabled = true;
        try {
          await signInWithEmailAndPassword(auth, email, password);
          // onAuthStateChanged will handle the rest
        } catch (err) {
          btn.textContent = 'Sign In to Shop Dashboard';
          btn.disabled = false;
          const messages = {
            'auth/invalid-credential': 'Wrong email or password. Please try again.',
            'auth/user-not-found': 'No account found with that email.',
            'auth/wrong-password': 'Incorrect password. Please try again.',
            'auth/too-many-requests': 'Too many failed attempts. Please wait a moment.',
            'auth/invalid-email': 'Please enter a valid email address.'
          };
          showLoginScreen(messages[err.code] || 'Login failed: ' + err.message);
        }
      });

      // ---------- REGISTER SHOP ----------
      function showRegisterModal() {
        const m = document.getElementById('registerShopModal');
        if (m) m.style.display = 'flex';
        const lo = document.getElementById('loginOverlay');
        if (lo) lo.style.display = 'none';
      }
      function hideRegisterModal() {
        const m = document.getElementById('registerShopModal');
        if (m) m.style.display = 'none';
        const lo = document.getElementById('loginOverlay');
        if (lo) lo.style.display = '';
      }

      document.getElementById('btnRegisterShop')?.addEventListener('click', showRegisterModal);
      document.getElementById('btnBackToLogin')?.addEventListener('click', hideRegisterModal);

      document.getElementById('registerShopForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regOwnerName').value.trim();
        const email = document.getElementById('regOwnerEmail').value.trim();
        const password = document.getElementById('regOwnerPassword').value;
        const errEl = document.getElementById('regError');
        const btn = document.getElementById('btnRegisterSubmit');
        if (!name || !email || !password) return;
        errEl.classList.add('hidden');
        btn.textContent = 'Creating account…';
        btn.disabled = true;
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          const uid = cred.user.uid;
          const ownerId = 'u_owner_' + uid.slice(0, 8);
          // Write initial shop state to the same path that loadFromFirestore reads
          const mainRef = doc(db, 'shops', uid, 'data', 'main');
          const initialState = getInitialState();
          initialState.shop.owner = name;
          initialState.shop.name = name + "'s Kirana Store";
          initialState.users = [{ id: ownerId, name, role: 'OWNER', badge: 'Owner Full Admin', active: true, email }];
          initialState.activeUserId = ownerId;
          await setDoc(mainRef, initialState);
          // Reset form
          document.getElementById('registerShopForm').reset();
          btn.textContent = 'Create Shop & Account';
          btn.disabled = false;
          showToast(`✅ Shop registered! Welcome ${name} — loading your dashboard…`, 'success');
          hideRegisterModal();
          // onAuthStateChanged fires automatically — it will call loadFromFirestore and renderAll
        } catch (err) {
          btn.textContent = 'Create Shop & Account';
          btn.disabled = false;
          errEl.textContent = err.message;
          errEl.classList.remove('hidden');
        }
      });



      // ---------- AUDIT VIEW ----------
      function showAuditModal() {
        const m = document.getElementById('auditModal');
        if (m) m.style.display = 'flex';
      }
      function hideAuditModal() {
        const m = document.getElementById('auditModal');
        if (m) m.style.display = 'none';
      }

      document.getElementById('btnAudit')?.addEventListener('click', async () => {
        if (!firestoreUid) { showToast('Please log in first.', 'warning'); return; }
        const tbody = document.getElementById('auditBody');
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-blue-300"><span class="animate-pulse">Loading sales data…</span></td></tr>';
        showAuditModal();
        try {
          const salesCol = collection(db, 'shops', firestoreUid, 'sales');
          const q = query(salesCol, orderBy('timestamp', 'desc'), limit(200));
          const snapshot = await getDocs(q);
          tbody.innerHTML = '';
          if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-neutral-400">No sales recorded yet. Complete a POS sale to see it here.</td></tr>';
            return;
          }
          let totalRevenue = 0, totalProfit = 0, rowCount = 0;
          snapshot.forEach(docSnap => {
            const s = docSnap.data();
            (s.items || []).forEach(item => {
              rowCount++;
              const rev = item.revenue ?? item.total ?? 0;
              const prof = item.profit ?? 0;
              totalRevenue += rev;
              totalProfit += prof;
              const tr = document.createElement('tr');
              tr.className = 'border-t border-neutral-800 hover:bg-white/[0.03] transition-colors';
              tr.innerHTML = `
                <td class="px-3 py-2 text-xs text-neutral-400 whitespace-nowrap">${new Date(s.timestamp).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</td>
                <td class="px-3 py-2 text-sm font-medium text-white">${item.productName || item.name || '—'}</td>
                <td class="px-3 py-2 text-xs text-neutral-300">${item.saleModeLabel || item.qty || '—'}</td>
                <td class="px-3 py-2 text-sm text-right font-semibold text-white">₹${rev.toFixed(2)}</td>
                <td class="px-3 py-2 text-sm text-right font-semibold text-emerald-400">+₹${prof.toFixed(2)}</td>
                <td class="px-3 py-2 text-xs text-neutral-400">${s.operatorName || '—'}<br><span class="text-neutral-500">${s.paymentMode || ''} · ${s.customerName || ''}</span></td>
              `;
              tbody.appendChild(tr);
            });
          });
          // Summary row
          const summaryRow = document.createElement('tr');
          summaryRow.className = 'border-t-2 border-neutral-600 bg-neutral-800/50 font-bold';
          summaryRow.innerHTML = `
            <td class="px-3 py-2 text-xs text-neutral-300" colspan="3">TOTAL (${rowCount} items, ${snapshot.size} bills)</td>
            <td class="px-3 py-2 text-sm text-right text-white">₹${totalRevenue.toFixed(2)}</td>
            <td class="px-3 py-2 text-sm text-right text-emerald-400">+₹${totalProfit.toFixed(2)}</td>
            <td class="px-3 py-2"></td>
          `;
          tbody.appendChild(summaryRow);
        } catch (err) {
          tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-red-400">Error loading data: ${err.message}</td></tr>`;
          console.error('Audit load error:', err);
        }
      });
      document.getElementById('closeAudit')?.addEventListener('click', hideAuditModal);


      // =========================================================================
      // GLOBAL DELEGATED CLICK HANDLERS (POS, Cart, Products, Staff)
      // =========================================================================
      document.body.addEventListener('click', (e) => {
        const quickPosBtn = e.target.closest('[data-quick-pos]');
        if (quickPosBtn) {
          const prodId = quickPosBtn.getAttribute('data-quick-pos');
          switchTab('pos');
          openCustomPosModal(prodId);
          return;
        }

        const posQuickAdd = e.target.closest('[data-pos-quick]');
        if (posQuickAdd) {
          const prodId = posQuickAdd.getAttribute('data-pos-quick');
          const mode = posQuickAdd.getAttribute('data-mode');
          if (mode === 'PACKET') addToPosCart(prodId, 'PACKET', 1);
          else if (mode === 'SINGLE') addToPosCart(prodId, 'SINGLE', 1);
          else if (mode === 'PACK_1') addToPosCart(prodId, 'PACK', 1);
          else if (mode === 'KG_0.25') addToPosCart(prodId, 'LOOSE_KG', 0.25);
          else if (mode === 'KG_0.5') addToPosCart(prodId, 'LOOSE_KG', 0.5);
          else if (mode === 'KG_1') addToPosCart(prodId, 'LOOSE_KG', 1.0);
          return;
        }

        const posCustomBtn = e.target.closest('[data-pos-custom]');
        if (posCustomBtn) {
          openCustomPosModal(posCustomBtn.getAttribute('data-pos-custom'));
          return;
        }

        const removeCartBtn = e.target.closest('[data-remove-cart]');
        if (removeCartBtn) {
          const cid = removeCartBtn.getAttribute('data-remove-cart');
          posCart = posCart.filter(i => i.cartId !== cid);
          renderCart();
          return;
        }

        const editProdBtn = e.target.closest('[data-edit-prod]');
        if (editProdBtn) {
          openProductModal(editProdBtn.getAttribute('data-edit-prod'));
          return;
        }

        const discountPromoBtn = e.target.closest('[data-discount-promo]');
        if (discountPromoBtn) {
          const prodId = discountPromoBtn.getAttribute('data-discount-promo');
          const p = state.products.find(x => x.id === prodId);
          if (p) {
            if (p.type === 'PACKET_LOOSE') p.packetSellPrice = Math.round(p.packetSellPrice * 0.95);
            else if (p.type === 'PACKAGED_WEIGHT') p.sellPricePerUnit = Math.round(p.sellPricePerUnit * 0.95);
            else p.sellPricePerKg = Math.round(p.sellPricePerKg * 0.95);
            saveState();
            renderAll();
            showToast(`Applied 5% clearance discount on ${p.name} to move stock faster!`, 'success');
          }
          return;
        }

        const switchUserBtn = e.target.closest('[data-switch-user]');
        if (switchUserBtn) {
          state.activeUserId = switchUserBtn.getAttribute('data-switch-user');
          saveState();
          renderAll();
          showToast(`Switched active seat to ${getCurrentUser().name}`, 'info');
        }
      });

      // =========================================================================
      // FIREBASE AUTH STATE CHANGE — App Lifecycle Driver
      // =========================================================================
      onAuthStateChanged(auth, async (user) => {
        const auditBtn = document.getElementById('btnAudit');
        if (user) {
          firestoreUid = user.uid;
          showToast('Connecting to cloud…', 'info');
          state = await loadFromFirestore();
          posCart = [];
          hideLoginScreen();
          // Show Audit button only when logged in
          if (auditBtn) auditBtn.style.display = 'flex';
          subscribeFirestore();
          renderAll();
          showToast(`Welcome! Shop data synced ☁️`, 'success');
        } else {
          firestoreUid = null;
          if (auditBtn) auditBtn.style.display = 'none';
          showLoginScreen();
        }
      });

      // Initial render (shows loading state before auth resolves)
      renderAll();
    });
