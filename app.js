(() => {
  let symptoms = [];
  let map;
  let speechUtterance = null;

  const $ = (sel) => document.querySelector(sel);
  const create = (tag, cls, txt) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (txt) el.textContent = txt;
    return el;
  };

  const nameInput       = $('#patientName');
  const ageInput        = $('#age');
  const symptomInput    = $('#symptom');
  const symptomListEl   = $('#symptomList');
  const tipsBox         = $('.tips');
  const langSelect      = $('#lang');
  const mapContainer    = $('#map');
  const stepsModal      = $('#stepsModal');
  const darkToggle      = $('#darkToggle');
  const checklistEl     = $('.checklist ul');

  function speakHelp() {
  const lang = langSelect.value || 'en-US';
  const tipsText = tipsBox.innerText.trim();
  if (!tipsText) return;

  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }

  const voices = speechSynthesis.getVoices();
  const selectedVoice = voices.find(v => v.lang === lang) || voices[0];

  speechUtterance = new SpeechSynthesisUtterance(tipsText);
  speechUtterance.lang = lang;
  if (selectedVoice) speechUtterance.voice = selectedVoice;

  speechSynthesis.speak(speechUtterance);
}
    langSelect.addEventListener('change', () => {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    speakHelp();
  }
});

  function renderSymptoms() {
    symptomListEl.innerHTML = '';
    symptoms.forEach(s => {
      const li = create('li');
      li.textContent = s;
      symptomListEl.appendChild(li);
    });
  }

  window.addSymptom = () => {
    const val = symptomInput.value.trim();
    if (!val) return;
    symptoms.push(val);
    symptomInput.value = '';
    renderSymptoms();
  };

  window.resetSymptoms = () => {
    symptoms = [];
    symptomInput.value = '';
    nameInput.value = '';
    ageInput.value = '';
    $('#location').value = '';
    $('#severity').value = 'mild';
    $('#duration').value = '';
    localStorage.removeItem('checklistState');
    renderChecklist();
    symptomListEl.innerHTML = '';
    tipsBox.querySelector('ul').innerHTML = `
      <li>Stay calm and reassure the patient</li>
      <li>Loosen tight clothing</li>
      <li>Make the patient sit and rest</li>
      <li>Chew and swallow an aspirin (if not allergic)</li>
      <li>Call emergency services immediately</li>
      <li>If unconscious and not breathing, begin CPR</li>
    `;
    if (map) map.remove();
    map = null;
    showToast('Form and map have been reset.', 'info');
  };

  function applyTheme(dark) {
    document.body.classList.toggle('dark-mode', dark);
    localStorage.setItem('heartcare-dark', dark ? '1' : '0');
    darkToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  }

  darkToggle.addEventListener('change', (e) => {
    applyTheme(e.target.checked);
  });

  const savedDark = localStorage.getItem('heartcare-dark') === '1';
  applyTheme(savedDark);
  darkToggle.checked = savedDark;

  window.showSteps = () => {
    stepsModal.style.display = 'block';
  };
  window.closeSteps = () => {
    stepsModal.style.display = 'none';
  };

  window.addEventListener('click', (e) => {
    if (e.target === stepsModal) stepsModal.style.display = 'none';
  });

  async function fetchHospitals() {
    return [
      { name: 'City Heart Clinic', lat: 28.64,  lng: 77.23 },
      { name: 'Metro Cardiac Centre', lat: 28.62, lng: 77.21 },
      { name: 'Hope Nursing Home',   lat: 28.66, lng: 77.22 }
    ];
  }

  function initMap(lat, lng) {
    if (map) {
      map.setView([lat, lng], 13);
      return;
    }
    map = L.map(mapContainer).setView([lat, lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);
  }

  async function addHospitalsToMap(lat, lng) {
    const hospitals = await fetchHospitals();
    hospitals.forEach(h => {
      const marker = L.marker([h.lat, h.lng]).addTo(map);
      marker.bindPopup(`<strong>${h.name}</strong>`);
    });
    const userMarker = L.marker([lat, lng]).addTo(map);
    userMarker.bindPopup('<strong>You are here</strong>').openPopup();
  }

  function showToast(message, type = 'danger') {
    const toast = create('div', `toast toast-${type}`);
    toast.innerHTML = `
      <span class="toast-icon">${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : type === 'info' ? 'ℹ️' : '🚨'}</span>
      <span class="toast-msg">${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  function renderChecklist() {
  checklistEl.innerHTML = '';
  const saved = JSON.parse(localStorage.getItem('checklistState') || '{}');
  const items = saved._customItems || [
    'Contact nearest hospital',
    'Keep emergency contact notified',
    'Prepare ID and health documents',
    'Monitor breathing and pulse'
  ];

  const newSavedItems = {};

  items.forEach(item => {
    const li = create('li');

    const cb = create('input');
    cb.type = 'checkbox';
    cb.checked = !!saved[item];
    if (cb.checked) li.classList.add('checked');

    const span = create('span', 'check-text', item);
    span.contentEditable = false;

    // Edit on double click
    span.addEventListener('dblclick', () => {
      span.contentEditable = true;
      span.focus();
    });

    // Save on blur or Enter key
    span.addEventListener('blur', () => saveEditedItem(span, item, saved));
    span.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        span.blur();
      }
    });

    cb.addEventListener('change', () => {
      saved[item] = cb.checked;
      li.classList.toggle('checked', cb.checked);
      localStorage.setItem('checklistState', JSON.stringify(saved));
    });

    // Delete button
    const delBtn = create('button', 'del-btn', '🗑️');
    delBtn.addEventListener('click', () => {
      const updated = items.filter(i => i !== item);
      saved._customItems = updated;
      localStorage.setItem('checklistState', JSON.stringify(saved));
      renderChecklist();
    });

    li.appendChild(cb);
    li.appendChild(span);
    li.appendChild(delBtn);
    checklistEl.appendChild(li);
  });

  // Input for new item
  const customLi = create('li');
  const customInput = create('input');
  customInput.type = 'text';
  customInput.placeholder = '➕ Add new item...';
  customInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && customInput.value.trim()) {
      const newItem = customInput.value.trim();
      customInput.value = '';
      const current = saved._customItems || items;
      const updated = [...current, newItem];
      saved._customItems = updated;
      localStorage.setItem('checklistState', JSON.stringify(saved));
      renderChecklist();
    }
  });
  customLi.appendChild(customInput);
  checklistEl.appendChild(customLi);
}

function saveEditedItem(span, oldItem, saved) {
  const newItem = span.textContent.trim();
  if (!newItem || newItem === oldItem) {
    span.contentEditable = false;
    return;
  }

  const savedState = JSON.parse(localStorage.getItem('checklistState') || '{}');
  const allItems = savedState._customItems || [];
  const updatedItems = allItems.map(i => (i === oldItem ? newItem : i));
  delete savedState[oldItem]; // Remove old checked state
  savedState._customItems = updatedItems;
  localStorage.setItem('checklistState', JSON.stringify(savedState));
  renderChecklist();
}



  renderChecklist();

  window.findHelp = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation not supported', 'warning');
      return;
    }
    showToast('Locating nearby hospitals...', 'info');
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude, longitude } = pos.coords;
      initMap(latitude, longitude);
      await addHospitalsToMap(latitude, longitude);
      mapContainer.scrollIntoView({ behavior: 'smooth' });

      const critical = symptoms.some(s => /chest pain|shortness of breath|faint/i.test(s));
      if (critical) {
        showToast('🚨 Critical symptom detected! Follow first aid and seek immediate care.', 'danger');
      }
    }, () => showToast('Unable to retrieve your location.', 'warning'));
  };

  function resizeMap() {
    if (map) map.invalidateSize();
  }
  window.addEventListener('resize', resizeMap);
})();
// Ensure the map resizes correctly on load
window.addEventListener('load', () => {
  if (typeof initMap === 'function') {
    initMap(28.61, 77.23); // Default to a central location
  }
  resizeMap();
});