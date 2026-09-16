from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    assert client.get('/health').json() == {'status': 'ok'}


def test_catalog_and_situation_flow():
    catalog = client.get('/api/v1/cards')
    assert catalog.status_code == 200
    assert len(catalog.json()['cards']) == 12
    r = client.post('/api/v1/analyze', json={'situation': 'My classmate replied bojio after I had lunch without them.'})
    assert r.status_code == 200
    result = r.json()
    assert result['cards'][0]['id'] == 'sg-humour-01'
    assert result['mode'] == 'reference'
    assert result['cards'][0]['provenance']['review_status'] == 'synthetic_unreviewed'
    assert result['sources']
    assert result['notice']
    practice = client.post('/api/v1/practice', json={
        'situation': 'My classmate replied bojio after lunch.',
        'card_id': 'sg-humour-01', 'response': 'Would you like to join us next time?'})
    assert practice.status_code == 200
    assert practice.json()['mode'] == 'self_check'
    assert practice.json()['criteria']


def test_unknown_does_not_force_a_card():
    r = client.post('/api/v1/analyze', json={'situation': 'How do I renew my passport?'})
    assert r.status_code == 200
    assert r.json()['cards'] == []
    assert r.json()['clarifying_questions']


def test_input_boundaries():
    for s in ['', '   ', 'x' * 4001]:
        assert client.post('/api/v1/analyze', json={'situation': s}).status_code == 422
    assert client.post('/api/v1/practice', json={'situation': 'hello', 'response': 'hello', 'card_id': 'not-real'}).status_code == 404


def test_peer_contribution_is_queued_without_entering_card_catalog(tmp_path, monkeypatch):
    queue_path = tmp_path / 'contributions.json'
    monkeypatch.setenv('CONTRIBUTIONS_PATH', str(queue_path))
    catalog_size = len(client.get('/api/v1/cards').json()['cards'])

    response = client.post('/api/v1/contributions', json={
        'phrase': 'Can help me chope a seat?',
        'contextScenario': 'A new classmate asked before lunch at the canteen.',
        'scenarioType': 'campus-life',
        'relationship': 'new-acquaintance',
        'literalMeaning': 'They may be asking me to reserve a seat.',
        'perspective1': 'A practical request before a busy lunch period.',
        'perspective2': 'It may also be a casual invitation to sit together.',
        'whatNotToAssume': 'Do not assume the request is rude or mandatory.',
        'suggestedReply': 'Sure—which table should I look for?',
        'contributorFaculty': 'Exchange student',
    })

    assert response.status_code == 202
    assert response.json()['status'] == 'pending_review'
    assert response.json()['id'].startswith('contrib-')
    assert len(client.get('/api/v1/cards').json()['cards']) == catalog_size
    queued = queue_path.read_text(encoding='utf-8')
    assert 'pending_review' in queued
    assert 'Can help me chope a seat?' in queued


def test_peer_contribution_rejects_invalid_phrase(tmp_path, monkeypatch):
    monkeypatch.setenv('CONTRIBUTIONS_PATH', str(tmp_path / 'contributions.json'))
    base = {
        'contextScenario': '',
        'scenarioType': 'teamwork',
        'relationship': 'peer-teammate',
        'literalMeaning': '',
        'perspective1': '',
        'perspective2': '',
        'whatNotToAssume': '',
        'suggestedReply': '',
        'contributorFaculty': '',
    }
    assert client.post('/api/v1/contributions', json={**base, 'phrase': '   '}).status_code == 422
    assert client.post('/api/v1/contributions', json={**base, 'phrase': 'x' * 301}).status_code == 422
