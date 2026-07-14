Feature: High-score lead follow-up
  Requirement: REQ-SALES-001

  Scenario: Create task when lead score exceeds threshold
    Given a lead exists with score 79
    When the lead score is updated to 81
    Then a follow-up task should be created
    And the task should be assigned to the Sales Manager

Feature: Low-score lead follow-up
  Requirement: REQ-SALES-005

  Scenario: AC-REQ-SALES-005-1: Create task when lead score drops to or below threshold
    Given a lead exists with score 50
    When the lead score is updated to 35
    Then a follow-up task should be created
    And the task should be assigned to the Product Manager
    And a notification should be sent to the Product Manager
