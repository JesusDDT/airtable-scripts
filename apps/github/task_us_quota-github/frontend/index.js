import {
  initializeBlock,
  useBase,
  useCursor,
  useRecords,
  useLoadable,
  useWatchable
} from '@airtable/blocks/ui';
import Table from 'react-bootstrap/Table'
import React, {useState, useEffect} from 'react';
import './App.css'; // Tell webpack that Button.js uses these styles

const quotas = {
  "Sunday": 10
}

function getQuota(dayOfWeek) {
  return quotas[dayOfWeek]
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
  function getAssigned(date) {
    return recordsAssignedToTaskUs.filter(r => r.getCellValueAsString("Date") == date).length
  }

  function getEligible(date, timeOfDay) {
    return recordsEligibleForTaskUs.filter(r => r.getCellValueAsString("Date") == date).length
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
  days.filter((day) => day.getDay() == 0).map((day) => {
    var date = day.toLocaleDateString("en-us", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).replaceAll("/", "-")
    var dayOfWeek = day.toLocaleDateString("en-us", {weekday: "long"})
    var quota = getQuota(dayOfWeek)
    var assigned = getAssigned(date)
    var eligible = getEligible(date)

    relevantDays.push({
      date: date,
      dayOfWeek: dayOfWeek,
      quota: quota,
      assigned: assigned,
      eligible: eligible,
      status: getStatus(quota, assigned, eligible)
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
