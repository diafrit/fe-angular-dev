import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { User, UserDraft } from './user.model';

@Injectable({ providedIn: 'root' })
export class UserApi {
  private readonly http = inject(HttpClient);

  list(name: string): Observable<User[]> {
    const params = new HttpParams().set('name', name);
    return this.http.get<User[]>('/api/users', { params });
  }

  create(draft: UserDraft): Observable<User> {
    return this.http.post<User>('/api/users', draft);
  }

  update(id: string, draft: UserDraft): Observable<User> {
    return this.http.put<User>(`/api/users/${id}`, draft);
  }
}
