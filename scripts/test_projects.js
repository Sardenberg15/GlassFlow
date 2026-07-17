fetch('http://localhost:5000/api/projects')
  .then(res => res.text())
  .then(data => console.log(data))
  .catch(err => console.error(err));
