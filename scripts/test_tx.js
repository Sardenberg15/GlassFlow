fetch('http://localhost:5000/api/transactions')
    .then(res => res.json())
    .then(data => console.log("First transaction:", data[0]))
    .catch(err => console.error(err));
