const pairForm = document.getElementById('pairForm');
const getSessionBtn = document.getElementById('getSession');
const statusDiv = document.getElementById('status');

function updateStatus(message, isError = false) {
  statusDiv.innerHTML = message;
  statusDiv.className = isError ? 'error' : 'success';
}

pairForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const phone = document.getElementById('phone').value;

  try {
    const response = await fetch('/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `phone=${encodeURIComponent(phone)}`,
    });
    const data = await response.json();

    if (data.success) {
      updateStatus(`Pairing code: <strong>${data.pairingCode}</strong>. Enter it in WhatsApp (Settings > Linked Devices > Link with Phone Number).`);
      if (data.session) {
        updateStatus(`${statusDiv.innerHTML}<br><pre>${JSON.stringify(data.session, null, 2)}</pre>`);
      }
    } else {
      updateStatus(data.error, true);
    }
  } catch (error) {
    updateStatus('Error: ' + error.message, true);
  }
});

getSessionBtn.addEventListener('click', async () => {
  try {
    const response = await fetch('/session');
    const data = await response.json();

    if (data.success) {
      updateStatus(`<h3>Session Data:</h3><pre>${JSON.stringify(data.session, null, 2)}</pre>`);
    } else {
      updateStatus(data.error, true);
    }
  } catch (error) {
    updateStatus('Error: ' + error.message, true);
  }
});
