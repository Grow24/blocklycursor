Feature: High-score lead follow-up
  Requirement: REQ-SALES-001

  Scenario: Create task when lead score exceeds threshold
    Given a lead exists with score 79
    When the lead score is updated to 81
    Then a follow-up task should be created
    And the task should be assigned to the Sales Manager

Feature: Low-score lead follow-up
  Requirement: REQ-SALES-005

  Scenario: Create task when lead score drops below threshold
    Given a lead exists with score 40
    When the lead score is updated to 30
    Then a follow-up task should be created
    And the task should be assigned to the Product Manager
    And the task title should be "Follow up with customer"
    And a notification should be sent to the Product Manager with message "High-score lead needs follow-up"
