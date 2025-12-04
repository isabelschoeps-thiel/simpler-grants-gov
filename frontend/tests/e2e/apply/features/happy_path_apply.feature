Feature: Happy Path – Apply Workflow
  As a grant applicant
  I want to complete the full Apply workflow successfully
  So that I can submit a complete application without errors

  Background:
    Given the user is able to login with all roles needed
    And the system is available

  @Happy-Path
  Scenario: Complete the full Apply workflow successfully
    # --- Login ---
    Launch the URL
    The user enters valid login credentials
    And the user logs in
    User goes to the search page
    Searches for the specific Funding Opportunity number
    Then the user is taken to the Funding Opportunities page

    # --- Starting Application ---
    The user clicks "Start Application"
    Start a new application modal opens
    User selects specific option in the 'Who's applying' drop down
    Enters the name of the application
    Then clicks on 'Create Application' button
    A new workspace is created
    And the Apply page loads with navigation and header

    # --- Completing Required and Optional Forms ---
    Under 'Required forms' there is one specific form (SF-424)
    The user completes all required fields in the SF-424 form and clicks on 'Save'
    Then the system saves the SF-424
    Under 'Conditionally required form' there can be any number of forms
    The user completes all required fields in one of the optional form and clicks on 'Save'
    User selects 'Yes' for the one optional form filled and remaining forms have 'No' selected
    The system saves the optional form
    And the user is taken to the next required form or step

    # --- Save Behavior ---
    When the user clicks "Save" in the form
    And no validation errors should appear

    # --- Uploading Documents ---
    The user uploads all required documents
    Under 'Attachment' header the user uploads a file
    And each file meets size and format requirements
    Then the documents are successfully attached to the application
    The uploaded file is listed in the 'Attached doocument' table

    # --- Complete All Required Forms ---
    When the user completes all the required forms
    And all validations pass
   
    # --- Review Application ---
    The user navigates to the Application page
    All sections now display "No issues detected" where applicable

    # --- Submitting the Application ---
    The user clicks "Submit application"
    Then the system submits the application successfully

    # --- Confirmation Page ---
    Then the user is taken to the submission confirmation page
    User currently sees a confirmation message

    # ---Below are for future development----
    And the user sees a confirmation number
    And the system displays the submission timestamp
    And a submission notification email is triggered
