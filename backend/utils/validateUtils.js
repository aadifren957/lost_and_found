/**
 * Validates if an email belongs to the PCCOE Pune organization.
 * @param {string} email - The email to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
function isValidOrganizationEmail(email) {
    if (!email) return false;
    return email.toLowerCase().endsWith("@pccoepune.org");
}

module.exports = {
    isValidOrganizationEmail
};
