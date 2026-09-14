 

window.addEventListener('echo:frame', (e) => {
  const { frame, time } = e.detail;
  // Animate here based on frame/time
});

window.addEventListener('echo:params', (e) => {
  const params = e.detail;
  // React to param changes here
});
