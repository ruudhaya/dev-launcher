// Simulates a project-code crash: the process exits before ever listening on a
// port, so there's no ready line and no port to poll.
console.error("simulated crash: broken-crash-on-start always exits immediately");
process.exit(1);
