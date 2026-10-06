const photoInput = document.querySelector('#photoInput');
const photoButton = document.querySelector('#photoButton');
const captureButton = document.querySelector('#captureButton');
const youCard = document.querySelector('#youCard');
const youPreview = document.querySelector('#youPreview');
const youStatus = document.querySelector('#youStatus');
const progressBar = document.querySelector('#progressBar');
const progressText = document.querySelector('#progressText');
const sparkCard = document.querySelector('#sparkCard');
const revealButton = document.querySelector('#revealButton');
const lockIcon = document.querySelector('#lockIcon');
const toast = document.querySelector('#toast');
let selectedMode = 'collage';

function openCamera() { photoInput.click(); }
photoButton.addEventListener('click', openCamera);
captureButton.addEventListener('click', openCamera);

photoInput.addEventListener('change', () => {
  const file = photoInput.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = event => {
    photoButton.style.backgroundImage = `url("${event.target.result}")`;
    photoButton.classList.add('has-image');
    youPreview.textContent = '';
    youCard.classList.add('checked-in');
    youStatus.textContent = 'Just now';
    captureButton.innerHTML = '<span>✓</span> You’re checked in';
    captureButton.disabled = true;
    progressBar.style.width = '100%';
    progressText.textContent = 'The whole crew is in!';
    document.querySelector('#miniYou').textContent = 'YOU';
    unlockSpark();
  };
  reader.readAsDataURL(file);
});

function unlockSpark() {
  lockIcon.textContent = '✦';
  revealButton.disabled = false;
  revealButton.textContent = 'Create tonight’s spark';
  document.querySelector('#spark-title').textContent = 'The circle is complete';
  document.querySelector('#sparkDescription').textContent = 'Everyone showed up. Choose the vibe, then reveal tonight’s shared memory.';
  showToast('Everyone’s in — tonight’s Spark is ready ✦');
}

document.querySelectorAll('.mode').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.mode').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  selectedMode = button.dataset.mode;
}));

revealButton.addEventListener('click', () => {
  revealButton.disabled = true;
  revealButton.textContent = 'Mixing today’s magic…';
  setTimeout(() => {
    sparkCard.classList.add('ready');
    sparkCard.classList.toggle('movie', selectedMode === 'movie');
    lockIcon.remove();
    document.querySelector('#spark-title').textContent = selectedMode === 'movie' ? 'Tiny dance floor, big energy' : 'The crew takes over the boardwalk';
    document.querySelector('#sparkDescription').textContent = selectedMode === 'movie' ? 'A looping mini movie made from today’s four check-ins.' : 'Today’s faces, remixed into a sunny little adventure together.';
    revealButton.textContent = 'Share with the crew ↗';
    revealButton.disabled = false;
    showToast('Your Spark is ready to share');
  }, 1250);
});

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

function updateCountdown() {
  const now = new Date();
  const close = new Date();
  close.setHours(21, 0, 0, 0);
  if (now > close) close.setDate(close.getDate() + 1);
  const seconds = Math.floor((close - now) / 1000);
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  document.querySelector('#countdown').textContent = `${h}:${m}:${s} left`;
}
updateCountdown();
setInterval(updateCountdown, 1000);
