import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ToasterService } from 'angular2-toaster';
import { map, takeUntil } from 'rxjs/operators';
import { SessionService } from 'src/app/core/session/session.service';
import { Token } from 'src/app/core/session/manager';
import { Closed } from 'src/app/core/utils/closed';

@Component({
  selector: 'shared-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss']
})
export class SignInComponent implements OnInit, OnDestroy {
  constructor(private readonly sessionService: SessionService,
    private readonly matDialogRef: MatDialogRef<SignInComponent>,
    private readonly toasterService: ToasterService,
  ) { }
  disabled = true

  name = ''
  password = ''
  remember = true
  visibility = false
  access: Token | undefined
  private closed_ = new Closed()
  ngOnInit(): void {
    const sessionService = this.sessionService
    sessionService.ready.then(() => {
      this.disabled = false

      sessionService.signining.pipe(
        takeUntil(this.closed_.observable),
      ).subscribe((disabled) => {
        this.disabled = disabled
      })

      sessionService.observable.pipe(
        takeUntil(this.closed_.observable),
        map((session) => {
          if (session) {
            return session.access
          }
          return undefined
        })
      ).subscribe((access) => {
        if (access?.token != this.access?.token) {
          this.access = access
        }
      })
    })
  }
  ngOnDestroy() {
    this.closed_.close()
  }
  onClose() {
    this.matDialogRef.close()
  }
  onSubmit() {
    this.closed_.watchPromise(
      this.sessionService.signin(this.name, this.password, this.remember),
      undefined,
      (e) => {
        this.toasterService.pop('error', undefined, e)
      },
    )
  }
}
