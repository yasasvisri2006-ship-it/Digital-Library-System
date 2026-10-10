function getHealth() {
  return {
    service: 'digital-library-api',
    timestamp: new Date().toISOString(),
  };
}

module.exports = { getHealth };
