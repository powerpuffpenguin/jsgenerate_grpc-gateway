import { HttpClient } from '@angular/common/http';
import { Component, OnInit, VERSION, OnDestroy } from '@angular/core';
import { ToasterService } from 'angular2-toaster';
import { interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ServerAPI } from 'src/app/core/core/api';
import { Closed } from 'src/app/core/utils/closed';
import { RequireNet } from 'src/app/core/utils/requirenet';
interface Response {
  platform: string
  tag: string
  commit: string
  date: string
  startAt: number
}
function durationString(d: any) {
  const result = new Array<string>()
  const days = Math.floor(d.asDays())
  if (days > 0) {
    result.push(`${days} days`)
  }
  const hours = Math.floor(d.asHours()) % 24
  if (hours > 0) {
    result.push(`${hours} hours`)
  }
  const minutes = Math.floor(d.asMinutes()) % 60
  if (minutes > 0) {
    result.push(`${minutes} minutes`)
  }
  const seconds = Math.floor(d.asSeconds()) % 60
  if (seconds > 0) {
    result.push(`${seconds} seconds`)
  }
  return result.join(' ')
}
@Component({
  selector: 'app-version',
  templateUrl: './version.component.html',
  styleUrls: ['./version.component.scss']
})
export class VersionComponent implements OnInit, OnDestroy {
  VERSION = VERSION
  response: Response | undefined
  private closed_ = new Closed()
  startAt: any
  started: string = ''
  constructor(private httpClient: HttpClient,
    private toasterService: ToasterService,
  ) { }
  ngOnInit(): void {
    RequireNet('moment').then((moment) => {
      ServerAPI.v1.features.systems.child('detail').get<Response>(this.httpClient,
      ).pipe(
        takeUntil(this.closed_.observable),
      ).subscribe((response) => {
        this.response = response
        this.startAt = moment.unix(response.startAt)
        const d = moment.duration(moment.unix(moment.now() / 1000).diff(this.startAt))
        this.started = durationString(d)
      }, (e) => {
        this.toasterService.pop('error',
          undefined,
          e,
        )
      })

      interval(1000).pipe(
        takeUntil(this.closed_.observable),
      ).subscribe(() => {
        if (this.startAt) {
          const d = moment.duration(moment.unix(moment.now() / 1000).diff(this.startAt))
          this.started = durationString(d)
        }
      })
    }, (e) => {
      this.toasterService.pop('error', undefined, e)
    })
  }
  ngOnDestroy() {
    this.closed_.close()
  }
}
