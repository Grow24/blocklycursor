Feature: High-score lead follow-up
  Requirement: REQ-SALES-001

  Scenario: Create task when lead score exceeds threshold
    Given a lead exists with score 79
    When the lead score is updated to 81
    Then a follow-up task should be created
    And the task should be assigned to the Sales Manager

  Scenario: Send notification when lead score exceeds threshold
    Given a lead exists with score 79
    When the lead score is updated to 81
    Then a notification should be sent to the Sales Manager
    And the notification message should be "High-score lead needs follow-up"
