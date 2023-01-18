import {
  initializeBlock,
  globalConfig,
  useBase,
  useRecords,
  Input,
  Button
} from '@airtable/blocks/ui';
import React, {useState} from "react";
import _ from 'lodash';
import {MDBDataTableV5, MDBIcon} from 'mdbreact';
import './App.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'bootstrap-css-only/css/bootstrap.min.css';
import 'mdbreact/dist/css/mdb.css';

const mapping = {
  0: "Avaliable All Day",
  1: "Avaliable All Day",
  2: "Avaliable All Day",
  3: "Avaliable All Day",
  4: "Avaliable All Day",
  5: "5-6 am PST",
  6: "6-7 am PST",
  7: "7-8 am PST",
  8: "8-9 am PST",
  9: "9-10 am PST",
  10: "10-11 am PST",
  11: "11am-12pm PST",
  12: "12-3 pm PST",
  13: "12-3 pm PST",
  14: "12-3 pm PST",
  15: "3-6 pm PST",
  16: "3-6 pm PST",
  17: "3-6 pm PST",
  18: "6-9 pm PST",
  19: "6-9 pm PST",
  20: "6-9 pm PST",
  21: "9-11 pm PST",
  22: "9-11 pm PST",
  23: "9-11 pm PST"
}

function TheMondayButton() {
  //Set initial state
  const [warnings, setWarnings] = useState([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  let inititalEndDate = new Date()
  inititalEndDate.setDate(inititalEndDate.getDate() + 6)
  const [endDate, setEndDate] = useState(inititalEndDate.toISOString().split('T')[0]);
  const [stateRecommendations, setRecommendations] = useState([]);
  const [dataByDay, setDataByDay] = useState({});

  //Get records
  const base = useBase();

  //Upcoming Events
  const eventScheduleTable = base.getTableByName('Event Schedule');
  let upcomingEvents = useRecords(eventScheduleTable.getView("Upcoming Produced Unassigned Events"))
  let assignedEvents = useRecords(eventScheduleTable.getView("Assigned Events"))

  //Past Events
  const pastEventsTable = base.getTableByName("Past Events");
  const pastEventsView = pastEventsTable.getView("Assigned Events");
  let pastEvents = useRecords(pastEventsView);

  //Operator Availability
  const availabilityTable = base.getTableByName("Operator Availability");
  let eligibleOperatorsView = availabilityTable.getView("Eligible Operators")
  let operatorAvailability = useRecords(eligibleOperatorsView);

  //Operator Schedule
  const scheduleTable = base.getTableByName("Operator Schedule");
  let scheduleView = scheduleTable.getView("Eligible")
  let operatorSchedule = useRecords(scheduleView);

  //Event Feedback
  const feedbackTable = base.getTableByName("Client Event Feedback");
  let feedbackRows = useRecords(feedbackTable);

  //Check that the data is looking good.
  function createWarnings() {
    if (warnings.length > 0) {
      setWarnings([]);
    }
    //1 - Check for missing client tier from upcoming Events
    let upcomingEventsWithoutClientTier = upcomingEvents.filter((e) => e.getCellValueAsString("JR - AM Status Table - Client Tier").length < 1);
    let clientTierWarnings = warnings;
    if (upcomingEventsWithoutClientTier.length > 0) {
      upcomingEventsWithoutClientTier.map((e) => {
        let message = "Event ID " + e.getCellValueAsString("Event ID") + " is missing a client tier."

        if (warnings.indexOf(message) < 0) {
          clientTierWarnings.push(message);
        }
      })
    }
    if (warnings.length !== clientTierWarnings.length) {
      setWarnings(clientTierWarnings);
    }

    //2 - Check for missing users on Availability
    let missingUsersOnAvailability = operatorAvailability.filter((o) => o.getCellValueAsString("User").length < 1);
    let missingUsersWarnings = warnings;
    if (missingUsersOnAvailability.length > 0) {
      missingUsersOnAvailability.map((o) => {
        let message = "User is missing on Operator Availability " + o.getCellValueAsString("Email Address")
        if (warnings.indexOf(message) < 0) {
          missingUsersWarnings.push(message);
        }
      });
    }
    if (warnings.length !== missingUsersWarnings.length) {
      setWarnings(missingUsersWarnings);
    }

    let operatorMissingTier = operatorAvailability.filter((o) => o.getCellValueAsString("Operator Tier Tracking - Operator Tier").length < 1)
    let missingTierWarnings = warnings;
    if (operatorMissingTier.length > 0) {
      operatorMissingTier.map((o) => {
        let message = "Tier is missing on Operator Availability " + o.getCellValueAsString("Email Address");
        if (warnings.indexOf(message) < 0) {
          missingTierWarnings.push(message);
        }
      })
      if (warnings.length !== missingTierWarnings.length) {
        setWarnings(missingTierWarnings);
      }
    }

    //3 - Check for Duplicate Users
    let valueArr = operatorAvailability.filter((o) => o.getCellValueAsString("User").length >= 1).map((o) => {
      return o.getCellValueAsString("User")
    });
    var isDuplicate = valueArr.some(function(item, idx) {
      return valueArr.indexOf(item) != idx
    });
    let duplicateWarnings = warnings;
    let message = "There are duplicate 'User' values in the Operator Availability Table."
    if (isDuplicate && duplicateWarnings.indexOf(message) < 0) {
      duplicateWarnings.push(message);
      if (duplicateWarnings.length !== warnings.length) {
        setWarnings(duplicateWarnings);
      }
    }
  }
  createWarnings();

  function update() {
    if (confirm("Are you sure") == true) {
      stateRecommendations.map((rec) => {
        eventScheduleTable.updateRecordAsync(rec.recordId, {
          'Recommended Operator': rec.operatorName,
          "RO - Match Level": {
            name: levels[rec.level]
          },
          "RO - Late Check-In Tally": parseInt(rec.lateCheckInTally) || 0,
          "RO - Missed Service Tally": parseInt(rec.missedServiceTally) || 0,
          "RO - Auto-assign?": rec.autoAssign,
          "RO - Operator Tier": rec.operatorTier
        });
      })
    }
  }

  async function buttonClicked() {
    //Create array of days b/w & including start and end
    let startDateTime = new Date(startDate);
    let endDateTime = new Date(endDate);
    var getDaysArray = function(s, e) {
      for (var a = [], d = new Date(s); d <= new Date(e); d.setDate(d.getDate() + 1)) {
        a.push(new Date(d));
      }
      return a;
    };
    let daysArray = getDaysArray(startDateTime, endDateTime);

    //Loop through days & get upcoming events for each day
    let daysObject = {}
    daysArray.map((day) => {
      let dateParts = day.toISOString().split('T')[0].split("-");
      let date = dateParts[1] + "-" + dateParts[2] + "-" + dateParts[0];
      let eventsOnDate = upcomingEvents.filter(event => event.getCellValueAsString("Date") == date);
      //Loop through events on date & group by preferred operator/tier
      daysObject[date] ||= {}
      eventsOnDate.map((event) => {
        let cid = event.getCellValueAsString("CID");
        let filler = "";
        if (event.getCellValueAsString("JR - AM Status - Preferred Operator")) {
          filler = "has_preferred_operator"
        } else {
          filler = event.getCellValueAsString("JR - AM Status Table - Client Tier")
        }
        daysObject[date][filler] ||= {}
        daysObject[date][filler][cid] ||= {
          preferred_operator: event.getCellValueAsString("JR - AM Status - Preferred Operator"),
          tier: event.getCellValueAsString("JR - AM Status Table - Client Tier"),
          events: []
        }
        daysObject[date][filler][cid].events.push(event);
        daysObject[date][filler][cid].events.sort((a, b) => {
          let aInt = parseInt(a.getCellValueAsString("JR - Check-In - Hour of Day (PT)"));
          let bInt = parseInt(b.getCellValueAsString("JR - Check-In - Hour of Day (PT)"));
          return a > b;
        })

      });

      //Sort keys by priority
      let sortOrder = [
        "has_preferred_operator",
        "VIP Strike",
        "1A - VIP",
        "1B - New Client (high needs)",
        "1C - Existing Client (high needs)",
        "1D - Recent Issues",
        "2 - New Client (Standard)",
        "3 - Standard Client",
        "4 - Easy/Low Risk",
        ""
      ]
      Object.keys(daysObject[date]).sort(function(a, b) {
        return sortOrder.indexOf(a) - sortOrder.indexOf(b);
      }).map((key) => {
        //For each key, loop through cids
        let cids = daysObject[date][key];
        Object.keys(cids).map((cidKey) => {
          //For each CID, loop through events & assign recommendations
          recommendOperatorsForCID(cids[cidKey]);
        })

      });

    });

    setDataByDay(daysObject);
  }

  function upcomingEventsByAssignedOperator(name) {
    return assignedEvents.filter(record => {
      let operatorName = record.getCellValueAsString("Assigned Operator").split('"').join('')
      return operatorName == name;
    })
  }

  function isOperatorMarkedAvailable(record) {
    let event = this;

    if ( (event.getCellValueAsString("Operator Type") != "SF" && event.getCellValueAsString("Operator Type") != "STRIKE") && (record.getCellValueAsString("Name") == "Logan Ricketts" )){
      return false
    }

    // let availabilityField = event.getCellValueAsString("JR - Operator Availability Field Name");
    // let availability = record.getCellValueAsString(availabilityField);

    let availability = null;
    let availabilities = operatorSchedule.filter(s => s.getCellValueAsString("Operator Id") == record.id && s.getCellValueAsString("Formatted Date") == event.getCellValueAsString("Formatted Date"))
    if (availabilities.length > 0){
      availability = availabilities[0].getCellValueAsString("Availability")
    }
    let startHour = parseInt(event.getCellValueAsString("JR - Check-In - Hour of Day (PT)"));
    let endHour = parseInt(event.getCellValueAsString("JR - End - Hour of Day (PT)"));

    let startHourIncluded = availability.includes(mapping[startHour])
    let endHourIncluded = availability.includes(mapping[endHour])
    if (availability == "Available All Day" || (startHourIncluded && endHourIncluded)) {
      return true;
    } else {
      return false;
    }

  }

  function isOperatorBusy(operator) {
    let selectedEvent = this;
    let upcomingEvents = upcomingEventsByAssignedOperator(operator.getCellValueAsString("User"));
    let selectedEventCheckInTime = Date.parse(selectedEvent.getCellValueAsString("JR - Check-In Time - PT"));
    let selectedEventEndTime = Date.parse(selectedEvent.getCellValueAsString("JR - End Time - PT"));
    let scheduleConflict = false;
    upcomingEvents.map(event => {
      let eventCheckInTime = Date.parse(event.getCellValueAsString("JR - Check-In Time - PT"));
      let eventEndTime = Date.parse(event.getCellValueAsString("JR - End Time - PT"));
      if ((selectedEventCheckInTime < eventEndTime && selectedEventEndTime > eventCheckInTime)) {
        scheduleConflict = true;
      }
    })
    return !scheduleConflict;
  }

  function isOperatorBusyFromStartTime(operator) {
    console.log("isOperatorBusyFromStartTime");
    let selectedEvent = this;
    let upcomingEvents = upcomingEventsByAssignedOperator(operator.getCellValueAsString("User"));
    let selectedEventCheckInTime = Date.parse(selectedEvent.getCellValueAsString("JR - Start Time - PT"));
    let selectedEventEndTime = Date.parse(selectedEvent.getCellValueAsString("JR - End Time - PT"));
    let scheduleConflict = false;
    upcomingEvents.map(event => {
      let eventCheckInTime = Date.parse(event.getCellValueAsString("JR - Start Time - PT"));
      let eventEndTime = Date.parse(event.getCellValueAsString("JR - End Time - PT"));
      if ((selectedEventCheckInTime <= eventEndTime && selectedEventEndTime >= eventCheckInTime)) {
        scheduleConflict = true;
      }
    })
    return !scheduleConflict;
  }

  function isOperatorAlreadyRecommended(operator) {
    let operatorIsAvailable = false;
    let selectedEvent = this;
    let selectedEventCheckInTime = Date.parse(selectedEvent.getCellValueAsString("JR - Check-In Time - PT"));
    let selectedEventEndTime = Date.parse(selectedEvent.getCellValueAsString("JR - End Time - PT"));
    let alreadyAssignedEvents = stateRecommendations.filter((event) => operator.id == event.recommendedOperator)
    if (alreadyAssignedEvents.length > 0) {
      alreadyAssignedEvents.map((event) => {
        let eventRecord = upcomingEvents.filter((e) => e.id == event.recordId)[0]
        let eventCheckInTime = Date.parse(eventRecord.getCellValueAsString("JR - Check-In Time - PT"));
        let eventEndTime = Date.parse(eventRecord.getCellValueAsString("JR - End Time - PT"));
        if ((selectedEventCheckInTime < eventEndTime && selectedEventEndTime > eventCheckInTime)) {
          operatorIsAvailable = true;
        }
      });
    }
    return !operatorIsAvailable;
  }

  function isOperatorCorrectTier(record) {
    let selectedEvent = this;
    let clientTier = selectedEvent.getCellValueAsString("JR - AM Status Table - Client Tier");
    let operatorTier = record.getCellValueAsString("Operator Tier Tracking - Operator Tier");
    const operatorToClientTierMapping = {
      "1": [
        "VIP Strike",
        "1A - VIP",
        "1B - New Client (High Needs)",
        "1C - Existing Client (high needs)",
        "1D - Recent Issues",
        "2 - New Client (Standard)",
        "3 - Standard Client",
        "4 - Easy/Low Risk"
      ],
      "2": [
        "2 - New Client (Standard)", "3 - Standard Client", "4 - Easy/Low Risk"
      ],
      "3": [
        "3 - Standard Client", "4 - Easy/Low Risk"
      ],
      "4/New": ["4 - Easy/Low Risk"],
      "": [""]
    }
    if(operatorToClientTierMapping[operatorTier]){
        return operatorToClientTierMapping[operatorTier].indexOf(clientTier) >= 0;
    } else {
      return false;
    }

  }

  function getOperatorWithMostExperience(operatorsFromPastEventsForThisClient, eligibleOperators) {
    let recommendedOperatorId = ""
    let eligibleOperatorsHash = []
    eligibleOperators.map((e) => {
      let lateCheckInTally = parseInt(e.getCellValueAsString("Operator Tier Tracking - Late Check-In Tally")) || 0;
      let missedServiceTally = parseInt(e.getCellValueAsString("Operator Tier Tracking - Missed Service Tally")) || 0;
      let experience = operatorsFromPastEventsForThisClient[e.getCellValueAsString("User")] || 0;

      eligibleOperatorsHash.push({
        id: e.id,
        experience: experience,
        tier: e.getCellValueAsString("Operator Tier Tracking - Operator Tier"),
        badTally: 0 + lateCheckInTally + missedServiceTally
      })
    });

    //Sort
    let operatorSortOrder = ["1", "2", "3", "4/New", ""]
    eligibleOperatorsHash.sort((a, b) => {
      let sameExperience = a.experience == b.experience
      let sameTier = operatorSortOrder.indexOf(a.tier) == operatorSortOrder.indexOf(b.tier)
      let sameTally = a.badTally == b.badTally

      if (a.experience < b.experience) {
        return -1
      }

      if (sameExperience && operatorSortOrder.indexOf(a.tier) < operatorSortOrder.indexOf(b.tier)) {
        return -1
      }

      if (sameExperience && sameTier && a.badTally < b.badTally) {
        return -1
      }

    });

    return eligibleOperatorsHash[0].id;
  }

  function recommendOperatorsForCID(customerObject) {
    customerObject.events.map((event) => {
      let recommendations = stateRecommendations;
      //What to store
      let warnings = [];
      let level = 0;
      let recommendedOperatorId = "";
      let keepLooking = true;

      //operators already recommened or working for this CID today
      let operatorsAlreadyRecommendedForCIDToday = stateRecommendations.filter((rec) => rec.cid == event.getCellValueAsString("CID") && rec.date == event.getCellValueAsString("Date")).map((rec) => rec.recommendedOperator);

      //Past Feedback from this client
      let pastFeedbackFromThisClient = feedbackRows.filter((f) => f.getCellValueAsString("Satisfaction") == 5 && f.getCellValueAsString("CID") == parseInt(event.getCellValueAsString("CID")).toString());

      //Determine past events from this client
      let pastEventsFromThisClient = pastEvents.filter((e) => e.getCellValueAsString("CID") == event.getCellValueAsString("CID"));
      let operatorsFromPastEventsForThisClient = []
      pastEventsFromThisClient.map((e) => {
        operatorsFromPastEventsForThisClient[e.getCellValueAsString("Assigned Operator")] = (operatorsFromPastEventsForThisClient[e.getCellValueAsString("Assigned Operator")] + 1) || 1;
      })

      //Determine availability & notBusy for this event
      let markedAvailableOperators = operatorAvailability.filter(isOperatorMarkedAvailable, event);
      let notBusyOperators = markedAvailableOperators.filter(isOperatorBusy, event);
      let notBusyFromStartTimeOperators = markedAvailableOperators.filter(isOperatorBusyFromStartTime, event);
      let notAlreadyRecommendedBusyFromStartTimeOperators = notBusyFromStartTimeOperators.filter(isOperatorAlreadyRecommended, event);
      let notAlreadyRecommendedOperators = notBusyOperators.filter(isOperatorAlreadyRecommended, event);
      let correctTierOperators = notAlreadyRecommendedOperators.filter(isOperatorCorrectTier, event);
      let coreGroupOperators = notAlreadyRecommendedOperators.filter((o) => o.getCellValueAsString("Operator Tier Tracking - Core Group?") == "checked")
      let coreGroupAndCorrectTierOperators = correctTierOperators.filter((o) => o.getCellValueAsString("Operator Tier Tracking - Core Group?") == "checked")

      //Level ONE - Preferred Operator match
      if (keepLooking && customerObject.preferred_operator.length > 0) {
        //If preferred operator exists in notAlreadyRecommendedOperators, then assign him.
        let preferredOperatorsMatch = notAlreadyRecommendedOperators.filter((o) => o.getCellValueAsString("Email Address") == customerObject.preferred_operator)
        if (preferredOperatorsMatch.length > 0) {
          keepLooking = false;
          recommendedOperatorId = preferredOperatorsMatch[0].id;
          level = 1;
        }
      }

      //Level TWO - Operator already assigned to this CID
      if (keepLooking && operatorsAlreadyRecommendedForCIDToday.length > 0) {
        operatorsAlreadyRecommendedForCIDToday.map((operatorId) => {
          if (keepLooking && notAlreadyRecommendedBusyFromStartTimeOperators.map(o => o.id).indexOf(operatorId) >= 0) {
            keepLooking = false;
            recommendedOperatorId = operatorId;
            level = 2;
          }
        });
      }

      //Level THREE - Five Star Rating from client in the past
      if (keepLooking && pastFeedbackFromThisClient.length > 0) {
        pastFeedbackFromThisClient.map((f) => {
          let userName = f.getCellValueAsString("Assigned Operator (from All Past Operated)")
          let userExistsInNotAlreadyRecommendedOperators = notAlreadyRecommendedOperators.filter((o) => o.getCellValueAsString("User") == userName);
          if (userExistsInNotAlreadyRecommendedOperators.length > 0) {
            keepLooking = false;
            recommendedOperatorId = userExistsInNotAlreadyRecommendedOperators[0].id
            level = 3
          }
        });
      }

      //From here on, pick the one who has the most experience with that location
      //Level FOUR - Tier match && core group
      if (keepLooking && coreGroupAndCorrectTierOperators.length > 0) {
        recommendedOperatorId = getOperatorWithMostExperience(operatorsFromPastEventsForThisClient, coreGroupAndCorrectTierOperators);
        keepLooking = false;
        level = 4;
      }

      //Level FIVE - Tier Match
      if (keepLooking && correctTierOperators.length > 0) {
        recommendedOperatorId = getOperatorWithMostExperience(operatorsFromPastEventsForThisClient, correctTierOperators);
        keepLooking = false;
        level = 5;
      }

      //Level SIX - Core Group
      if (keepLooking && coreGroupOperators.length > 0) {
        recommendedOperatorId = getOperatorWithMostExperience(operatorsFromPastEventsForThisClient, coreGroupOperators);
        keepLooking = false;
        level = 6;
      }

      //Level SEVEN -- anyone
      if (keepLooking && notAlreadyRecommendedOperators.length > 0) {
        recommendedOperatorId = getOperatorWithMostExperience(operatorsFromPastEventsForThisClient, notAlreadyRecommendedOperators);
        keepLooking = false;
        level = 7;
      }

      //Set the values in the recommendations array
      let operator = operatorAvailability.filter((r) => r.id == recommendedOperatorId)[0]
      let autoAssign = false;
      let operatorHasExperience = false;
      let lateCheckInTally = 0;
      let missedServiceTally = 0;
      if (operator) {
        operatorHasExperience = operatorsFromPastEventsForThisClient.indexOf(operator.getCellValueAsString("User")) >= 0
        lateCheckInTally = parseInt(operator.getCellValueAsString("Operator Tier Tracking - Late Check-In Tally")) || 0;
        missedServiceTally = parseInt(operator.getCellValueAsString("Operator Tier Tracking - Missed Service Tally")) || 0;
        if (level == 1 || operator.getCellValueAsString("Operator Tier Tracking - Operator Tier") == "1") {
          autoAssign = true;
        } else if (level <= 5 && operator.getCellValueAsString("Operator Tier Tracking - Core Group?") == "checked" && (lateCheckInTally + missedServiceTally <= 2)) {
          autoAssign = true;
        }

      }

      let obj = {
        recordId: event.id,
        update: (level == 0 || level == 6 || level == 7)
          ? "false"
          : "true",
        eventTitle: event.getCellValueAsString("Event Title"),
        date: event.getCellValueAsString("Date"),
        serviceLength: event.getCellValueAsString("Service Length"),
        location: event.getCellValueAsString("Location"),
        threeCam: event.getCellValueAsString("3+ cam"),
        permanentNotes: event.getCellValueAsString("Event Operator Notes (Permanent)"),
        operatorNotes: event.getCellValueAsString("Operator Notes"),
        internalNotes: event.getCellValueAsString("Internal Notes"),
        cueSheet: event.getCellValueAsString("Cue Sheet URL"),
        eventId: event.getCellValueAsString("Event ID"),
        cid: event.getCellValueAsString("CID"),
        clientName: event.getCellValueAsString("Client Name"),
        clientTier: event.getCellValueAsString("JR - AM Status Table - Client Tier"),
        checkInTime: event.getCellValueAsString("JR - Check-In Time - PT"),
        startTime: event.getCellValueAsString("JR - Start Time - PT"),
        endTime: event.getCellValueAsString("JR - End Time - PT"),
        recommendedOperator: recommendedOperatorId,
        level: level
      }
      if (operator) {
        obj.autoAssign = autoAssign;
        obj.operatorName = operator.getCellValueAsString("User");
        obj.operatorEmail = operator.getCellValueAsString("Email Address");
        obj.operatorPhone = operator.getCellValueAsString("Phone number");
        obj.operatorTier = operator.getCellValueAsString("Operator Tier Tracking - Operator Tier");
        obj.coreGroup = operator.getCellValueAsString("Operator Tier Tracking - Core Group?");
        obj.perfArtsCertified = operator.getCellValueAsString("Operator Tier Tracking - Perf. Arts Certified");
        obj.missedServiceTally = operator.getCellValueAsString("Operator Tier Tracking - Missed Service Tally");
        obj.lateCheckInTally = operator.getCellValueAsString("Operator Tier Tracking - Late Check-In Tally");
        obj.sfApproved = operator.getCellValueAsString("SF Approved");
      }
      recommendations.push(obj);
      setRecommendations(recommendations);

    })
    stateRecommendations.map((event) => {
      if (event.operatorName) {
        let recommendedEventsForThisOperator = stateRecommendations.filter((r) => r.recommendedOperator == event.recommendedOperator)
        let recommendedEventsForThisOperatorThisDay = recommendedEventsForThisOperator.filter((r) => r.date == event.date);
        let assignedEventsForThisOperator = assignedEvents.filter((r) => r.getCellValueAsString("Assigned Operator") == event.operatorName);
        let assignedEventsForThisOperatorThisDay = assignedEventsForThisOperator.filter((r) => r.getCellValueAsString("Date") == event.date);

        let index = stateRecommendations.indexOf(event);
        event.totalAssignedHours = _.round(assignedEventsForThisOperator.reduce((a, b) => a + parseFloat(b.getCellValueAsString("Service Length")), 0), 2);
        event.totalAssignedHoursThisDay = _.round(assignedEventsForThisOperatorThisDay.reduce((a, b) => a + parseFloat(b.getCellValueAsString("Service Length")), 0), 2);
        event.totalRecommendedHours = _.round(recommendedEventsForThisOperator.reduce((a, b) => a + parseFloat(b.serviceLength), 0), 2);
        event.totalRecommendedHoursThisDay = _.round(recommendedEventsForThisOperatorThisDay.reduce((a, b) => a + parseFloat(b.serviceLength), 0), 2);
        event.totalHours = _.round(event.totalAssignedHours + event.totalRecommendedHours, 2)
        event.totalHoursThisDay = _.round(event.totalAssignedHoursThisDay + event.totalRecommendedHoursThisDay, 2)
        stateRecommendations[index] = event
      }
    });

  }

  const levels = {
    0: "0 - Not Processed",
    1: "1 - Preferred Operator",
    2: "2 - Already assigned to CID",
    3: "3 - Prev 5-star Rating",
    4: "4 - Tier Match & Core Group",
    5: "5 - Tier Match",
    6: "6 - Core Group",
    7: "7 - Anyone"
  }

  let columns = [
    {
      label: 'Event ID',
      field: 'eventId',
      sort: 'asc',
      width: 270
    }, {
      label: 'Date',
      field: 'date',
      sort: 'asc',
      width: 270
    }, {
      label: 'Check-In Time',
      field: 'checkInTime',
      sort: 'asc',
      width: 270
    }, {
      label: 'Start Time',
      field: 'startTime',
      sort: 'asc',
      width: 270
    }, {
      label: 'End Time',
      field: 'endTime',
      sort: 'asc',
      width: 270
    }, {
      label: 'Match Level',
      field: 'level',
      sort: 'asc',
      width: 270
    }, {
      label: 'Operator',
      field: 'operatorName',
      sort: 'asc',
      width: 270
    }, {
      label: 'Total Recommended Hours',
      field: 'totalRecommendedHours',
      sort: 'asc',
      width: 270
    }, {
      label: 'Total Recommended Hours (this day)',
      field: 'totalRecommendedHoursThisDay',
      sort: 'asc',
      width: 270
    }, {
      label: 'Total Hours (incl. already assigned)',
      field: 'totalHours',
      sort: 'asc',
      width: 270
    }, {
      label: 'Total Hours this day (incl. already assigned)',
      field: 'totalHoursThisDay',
      sort: 'asc',
      width: 270
    }, {
      label: 'CID',
      field: 'cid',
      sort: 'asc',
      width: 270
    }, {
      label: 'Client Name',
      field: 'clientName',
      sort: 'asc',
      width: 270
    }, {
      label: 'Event Title',
      field: 'eventTitle',
      sort: 'asc',
      width: 270
    }, {
      label: 'Location',
      field: 'location',
      sort: 'asc',
      width: 270
    }, {
      label: '3+ Cam?',
      field: 'threeCam',
      sort: 'asc',
      width: 270
    }, {
      label: 'Operator Notes',
      field: 'operatorNotes',
      sort: 'asc',
      width: 270
    }, {
      label: 'Cue Sheet',
      field: 'cueSheet',
      sort: 'asc',
      width: 270
    }, {
      label: 'Internal Notes',
      field: 'internalNotes',
      sort: 'asc',
      width: 270
    }
  ]

  return (<div className="app">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossOrigin="anonymous"/>
    <div className="container mt-3">
      <div className="row">
        <div className="col-12 mb-3">
          <h2>Warnings</h2>
          <ul>
            {warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </div>
        <div className="col-12">
          <h1>Instructions</h1>
          <p>Before using this tool, ensure that:</p>
          <ol>
            <li>All Operator Availability Rows have an Operator Tier, a User, and a Core Group, as needed</li>
            <li>Ensure there are no duplicates in the Operator Availability Rows</li>
            <li>Ensure that all Scheduled Events have a client tier and a preferred operator, where necessary.</li>
            <li>Ensure that the dates below map to Availability columns in the Operator Availability Table</li>
          </ol>
          <p>It usually takes about 10 seconds to run.</p>
          <p>Number of Events recommended: {stateRecommendations.length}</p>
        </div>
        <div className="col-2">
          <h3>Start Date</h3>
          <Input value={startDate} onChange={e => setStartDate(e.target.value)} type="date"/>
        </div>
        <div className="col-2">
          <h3>End Date</h3>
          <Input value={endDate} onChange={e => setEndDate(e.target.value)} type="date"/>
        </div>
        <div className="col-3 text-center">
          <h3 className="text-center">Run iT</h3>
          <Button onClick={() => buttonClicked()} variant="primary" icon="timeline">Run It!</Button>
        </div>
        <div className="col-3 text-center">
          <h3 className="text-center">Update (Recommended Operator Field)</h3>
          <Button onClick={() => update()} variant="primary" icon="timeline">Update!</Button>
        </div>
      </div>
      <div className="row mt-4">
        <p>Match Levels:</p>
        <ul>
          <li>0 - Not Processed (You shouldn't ever see this one)</li>
          <li>1 - Preferred Operator</li>
          <li>2 - Already assigned to CID</li>
          <li>3 - Prev 5-star Rating</li>
          <li>4 - Tier Match & Core Group</li>
          <li>5 - Tier Match</li>
          <li>6 - Core Group (danger zone)</li>
          <li>7 - Anyone (danger zone squared)</li>
        </ul>
        <p>From level 4 and downward, it looks for the person with the most experience at that CID, and then for the person with the highest tier.
        </p>
      </div>
      <div className="row mt-4">
        <div className="col-12">
          <div className="col-12">
            <h3 className="mt-3">Issues ({stateRecommendations.filter((r) => r.update == "false").length})</h3>
            <MDBDataTableV5 paging={false} order={['checkInTime', 'asc']} searchTop="searchTop" searchBottom={false} data={{
                columns: columns,
                rows: stateRecommendations.filter((r) => r.update == "false")
              }}/>
          </div>
          <div className="col-12">
            <h3 className="mt-3">Good to Go ({stateRecommendations.filter((r) => r.update == "true").length})</h3>
            <MDBDataTableV5 paging={false} order={['checkInTime', 'asc']} searchTop="searchTop" searchBottom={false} data={{
                columns: columns,
                rows: stateRecommendations.filter((r) => r.update == "true")
              }}/>
          </div>
        </div>
      </div>
    </div>
  </div>)
}
initializeBlock(() => <TheMondayButton/ >);
