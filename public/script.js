document.getElementById('emailForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent default form submission
    const email = document.getElementById('emailInput').value;

    axios.post('/submit_email', { email })
        .then(response => {
            const messageDiv = document.getElementById('message');
            if (response.data.success) {
                messageDiv.textContent = 'Email submitted successfully!';
                messageDiv.style.color = 'green';
            } else {
                messageDiv.textContent = 'Failed to submit email.';
                messageDiv.style.color = 'red';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            const messageDiv = document.getElementById('message');
            messageDiv.textContent = 'Error submitting email.';
            messageDiv.style.color = 'red';
        });
});
