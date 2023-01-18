import {
  initializeBlock,
  useBase,
  useCursor,
  useRecords,
  useLoadable,
  useWatchable
} from '@airtable/blocks/ui';
import Table from 'react-bootstrap/Table'
import Blah from './Blah';
import React, {useState, useEffect} from 'react';
import './App.css'; // Tell webpack that Button.js uses these styles

const quotas = {
  "Saturday-Early": 5,
  "Saturday-Morning": 5,
  "Saturday-Midday": 5,
  "Sunday-Early": 5,
  "Sunday-Morning": 10,
  "Sunday-Midday": 5,
  "Sunday-Early": 5
}

function getQuota(dayOfWeek, timeOfDay) {
  return quotas[dayOfWeek + "-" + timeOfDay]
}

function TaskUsQuota() {
  //Load Records
  const base = useBase();
  const table = base.getTableByName('Event Schedule');
  const view = table.getView("Upcoming Produced Events")
  function isAssignedToTaskUs(record) {
    return record.getCellValueAsString("Operator Type").includes("TU");
  }
  function eligibleForTaskUs(record) {
    return record.getCellValueAsString("JR - TaskUs Eligible?").includes("TRUE");
  }
  const records = useRecords(view, {
    fields: [
      "Operator Type",
      "Date",
      "JR - Day of Week (PT)",
      "JR - Hour of Day Category (PT)",
      "JR - AM Status Table - Client Tier",
      "JR - TaskUs Eligible?"
    ]
  })
  const recordsAssignedToTaskUs = records.filter(isAssignedToTaskUs);
  const recordsEligibleForTaskUs = records.filter(eligibleForTaskUs);

  //
  function getAssigned(date, timeOfDay) {
    return recordsAssignedToTaskUs.filter(r => r.getCellValueAsString("Date") == date && r.getCellValueAsString("JR - Hour of Day Category (PT)") == timeOfDay).length
  }

  function getEligible(date, timeOfDay) {
    return recordsEligibleForTaskUs.filter(r => r.getCellValueAsString("Date") == date && r.getCellValueAsString("JR - Hour of Day Category (PT)") == timeOfDay).length
  }

  //Get Days
  var date = new Date();
  var loop_count = 31;
  var days = [date];
  var next_day;
  var loop_index;

  function getNextDay(date) {
    return new Date(new Date(date).setDate(date.getDate() + 1));
  }

  for (loop_index = 1; loop_index <= loop_count; loop_index++) {
    next_day = getNextDay(next_day || date);
    days.push(next_day);
  }

  const timesOfDay = [
    {
      timeOfDay: "Early"
    }, {
      timeOfDay: "Morning"
    }, {
      timeOfDay: "Midday"
    }
  ]

  function getStatus(quota, assigned, eligible){
    var status = ""
    if (eligible >= quota){
      status = "possible"
    }
    if (eligible < quota){
      status = "impossible"
    }
    if (assigned == quota){
      status = "good"
    }
    if (assigned > quota){
      status = "overflow"
    }
    return status;
  }
  var relevantDays = []
  days.filter((day) => day.getDay() == 0 || day.getDay() == 6).map((day) => {
    var date = day.toLocaleDateString("en-us", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).replaceAll("/", "-")
    var dayOfWeek = day.toLocaleDateString("en-us", {weekday: "long"})
    timesOfDay.map(t => {

      var quota = getQuota(dayOfWeek, t.timeOfDay)
      var assigned = getAssigned(date, t.timeOfDay)
      var eligible = getEligible(date, t.timeOfDay)

      relevantDays.push({
        date: date,
        dayOfWeek: dayOfWeek,
        timeOfDay: t.timeOfDay,
        quota: quota,
        assigned: assigned,
        eligible: eligible,
        status: getStatus(quota, assigned, eligible)
      })
    })
  })

  return (<div>
    <div className="key">
      <p>Key</p>
      <div className="good">Assigned hits Quota</div>
      <div className="overflow">Assigned is greater than Quota</div>
      <div className="possible">Eligible can fill Quota</div>
      <div className="impossible">Eligible cannot fill Quota</div>
    </div>
    <Table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Day of Week</th>
          <th>Time of Day</th>
          <th>Quota</th>
          <th>Assigned</th>
          <th>Eligible</th>
        </tr>
      </thead>
      <tbody>
        {
          relevantDays.map(day => {
            return <tr key={day.toString()} className={day.status}>
              <td>{day.date}</td>
              <td>{day.dayOfWeek}</td>
              <td>{day.timeOfDay}</td>
              <td>{day.quota}</td>
              <td>{day.assigned}</td>
              <td>{day.eligible}</td>
            </tr>
          })
        }
      </tbody>
    </Table>
  </div>)

}
initializeBlock(() => <TaskUsQuota/>);
