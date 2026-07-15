# CRM AI HCP

An AI-first Customer Relationship Management system designed specifically for Healthcare Professionals (HCPs). This system enables field representatives to efficiently log interactions, manage HCP relationships, and leverage AI-powered insights for better engagement.

## 🌟 Key Features

### Dual Interface for Interaction Logging
- **Structured Form**: Traditional form-based interaction logging with full field-level control
- **Conversational Chat**: Natural language interface powered by AI for seamless interaction logging
- **Smart Form Prefill**: AI automatically populates forms based on chat conversations

### AI-Powered Capabilities
- **Intelligent Entity Extraction**: Automatically extracts HCP names, dates, times, topics, and sentiment from natural language
- **Sentiment Analysis**: Determines interaction sentiment (positive, neutral, negative) for relationship insights
- **Follow-up Recommendations**: AI suggests optimal follow-up timing and actions based on interaction history
- **Voice Note Summarization**: Converts voice notes into structured interaction summaries

### LangGraph Agent with 5 Tools
1. **Log Interaction**: Captures interaction data with AI-generated summaries and entity extraction
2. **Edit Interaction**: Allows modification of logged interaction data
3. **Search HCP**: Find Healthcare Professionals by name, specialty, hospital, or city
4. **View Interaction History**: Retrieve chronological interaction history for specific HCPs
5. **Recommend Follow-up**: Analyzes past interactions to suggest next steps

### Modern User Experience
- **Real-time Updates**: Optimistic UI updates for instant feedback
- **Contextual HCP Panel**: Shows HCP details, interaction history, and follow-up suggestions
- **Responsive Design**: Mobile-friendly interface using Tailwind CSS
- **Toast Notifications**: User-friendly feedback for all actions

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 18.3.1 with hooks
- Redux Toolkit for state management
- Vite for fast development and building
- Tailwind CSS 4.3.2 for styling
- React Hook Form with Zod validation
- Axios for API communication
- React Hot Toast for notifications

**Backend:**
- FastAPI 0.139.0 for high-performance API
- SQLAlchemy 2.0.51 for ORM
- PostgreSQL database with Alembic migrations
- LangGraph 1.2.9 for AI agent orchestration
- LangChain 1.3.13 for LLM integration
- Groq API for LLM services (llama-3.1-8b-instant)
- Pydantic for data validation

**AI/ML:**
- LangGraph for agent workflow management
- LangChain for LLM tool integration
- Groq for fast inference
- Custom entity extraction using regex patterns
- Sentiment analysis pipeline

### System Architecture

```
┌─────────────────┐
│   Frontend      │
│  (React + Redux)│
└────────┬────────┘
         │ HTTP
         ↓
┌─────────────────┐
│   FastAPI       │
│   Backend       │
└────────┬────────┘
         │ Function Call
         ↓
┌─────────────────┐
│  LangGraph      │
│   Agent         │
└────────┬────────┘
         │ Tool Calls
         ↓
┌─────────────────┐
│  Groq LLM +     │
│   Tools         │
└────────┬────────┘
         │ SQL
         ↓
┌─────────────────┐
│  PostgreSQL     │
│   Database      │
└─────────────────┘
```

### LangGraph Flow

```
User Input
    ↓
LLM (Groq)
    ↓
Intent Understanding
    ↓
Router
    ↓
Tool Selection
    ↓
Tool Execution
    ↓
Database Operations
    ↓
LLM Response Generation
    ↓
Final Response
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.13+
- PostgreSQL 12+
- Groq API key

### Environment Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd crm-ai-hcp
```

2. **Backend Setup**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

3. **Configure Environment**
Create a `.env` file in the backend directory:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/crm_hcp
GROQ_API_KEY=your_groq_api_key_here
MODEL=llama-3.1-8b-instant
```

4. **Database Setup**
```bash
# Initialize database
alembic upgrade head
```

5. **Start Backend Server**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

6. **Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

7. **Access the Application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## 📡 API Documentation

### HCP Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hcps` | List/search HCPs with pagination |
| GET | `/api/hcps/{id}` | Get specific HCP details |
| POST | `/api/hcps` | Create new HCP |
| PUT | `/api/hcps/{id}` | Update HCP information |

### Interaction Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/interactions` | List all interactions |
| GET | `/api/interactions/{id}` | Get specific interaction |
| GET | `/api/hcps/{id}/interactions` | Get interaction history for HCP |
| POST | `/api/interactions` | Log new interaction |
| PUT | `/api/interactions/{id}` | Edit existing interaction |
| DELETE | `/api/interactions/{id}` | Delete interaction |

### AI Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/chat` | Chat with LangGraph agent |
| POST | `/api/ai/voice-summary` | Summarize voice notes |
| POST | `/api/ai/follow-up` | Generate follow-up suggestions |

## 🤖 LangGraph Tools

### 1. Log Interaction
Captures interaction data with AI-powered entity extraction and summarization.

**Features:**
- Automatic HCP creation if not exists
- Entity extraction (HCP name, date, time, topics, materials)
- Sentiment analysis
- Structured prefill mode for user confirmation
- Voice note summarization

**Example Usage:**
```
User: "I met Dr. Sharma today at 2 PM, discussed diabetes medication, shared brochure"
AI: Extracts entities and populates form with:
- HCP: Dr. Sharma
- Date: Today
- Time: 14:00
- Topics: diabetes medication
- Materials: clinical trial brochure
- Sentiment: neutral
```

### 2. Edit Interaction
Modifies existing interaction records with prefill of current values.

**Features:**
- Prefills current interaction data
- Allows selective field updates
- Maintains audit trail with timestamps

### 3. Search HCP
Finds Healthcare Professionals using flexible search criteria.

**Search Parameters:**
- Name (partial matching)
- Specialty
- Hospital
- City

**Example:**
```
User: "Search for cardiologists in Mumbai"
AI: Returns list of cardiologists in Mumbai
```

### 4. View Interaction History
Retrieves chronological interaction history for specific HCPs.

**Features:**
- Chronological ordering
- Sentiment trends
- Outcomes tracking
- Follow-up status

**Example:**
```
User: "Show my previous meetings with Dr. Sharma"
AI: Returns summarized interaction history with key insights
```

### 5. Recommend Follow-up
Analyzes interaction history to suggest optimal follow-up actions.

**Analysis Factors:**
- Days since last contact
- Previous sentiment
- Pending outcomes
- Historical patterns

**Example:**
```
User: "When should I follow up with Dr. Sharma?"
AI: "Based on positive engagement 2 days ago, recommend following up within the next week to discuss new product opportunities."
```

## 🗄️ Database Schema

### HCP Table
```sql
CREATE TABLE hcps (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(255),
    hospital VARCHAR(255),
    city VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Interaction Table
```sql
CREATE TABLE interactions (
    id SERIAL PRIMARY KEY,
    hcp_id INTEGER REFERENCES hcps(id),
    interaction_type VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    time TIME,
    attendees TEXT,
    topics_discussed TEXT,
    voice_note_summary TEXT,
    materials_shared TEXT,
    samples_distributed TEXT,
    sentiment VARCHAR(20),
    outcomes TEXT,
    follow_up_actions TEXT,
    ai_suggested_followups TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 💡 Usage Examples

### Chat-Based Interaction Logging

**Example 1: Simple Visit**
```
User: "I met Dr. Sharma today and discussed diabetes medication"
System: 
- Extracts: HCP (Dr. Sharma), Date (today), Topics (diabetes medication)
- Routes to: Log Interaction tool
- Returns: Structured prefill data with confirmation prompt
```

**Example 2: Detailed Call**
```
User: "I called Dr. Patel at 3 PM about pricing, he seemed concerned"
System:
- Extracts: HCP (Dr. Patel), Time (15:00), Topics (pricing), Sentiment (negative)
- Routes to: Log Interaction tool
- Returns: Form populated with extracted data
```

**Example 3: Follow-up Query**
```
User: "Recommend follow-up for Dr. Sharma"
System:
- Routes to: Recommend Follow-up tool
- Analyzes: Interaction history and sentiment
- Returns: Specific timing and action recommendations
```

### Form-Based Interaction Logging

1. Select HCP from dropdown or search
2. Fill in interaction details (type, date, time, topics, etc.)
3. Add materials shared and samples distributed
4. Set sentiment and outcomes
5. Specify follow-up actions
6. Save interaction

## 🎨 UI Components

### Main Interface
- **HCP Selector**: Searchable dropdown for HCP selection
- **Structured Form**: Comprehensive form with validation
- **Chat Interface**: Conversational AI assistant
- **Interaction History**: Chronological list of past interactions
- **HCP Panel**: Contextual HCP information and insights

### Key Features
- **Real-time Validation**: Form validation with Zod schemas
- **Optimistic Updates**: Instant UI feedback
- **Responsive Design**: Works on desktop and mobile
- **Toast Notifications**: User-friendly action feedback
- **Loading States**: Clear loading indicators

## 🔧 Configuration

### Backend Configuration (`backend/app/config.py`)
```python
class Settings(BaseSettings):
    database_url: str
    groq_api_key: str
    model: str = "llama-3.1-8b-instant"
```

### Frontend Configuration (`frontend/src/api/api.js`)
```javascript
const api = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 30000,
});
```

## 🧪 Testing

### Backend Testing
```bash
cd backend
pytest tests/
```

### Frontend Testing
```bash
cd frontend
npm test
```

### Manual Testing Checklist
- [ ] Form-based interaction logging
- [ ] Chat-based interaction logging
- [ ] Entity extraction accuracy
- [ ] Sentiment analysis
- [ ] HCP search functionality
- [ ] Interaction history retrieval
- [ ] Follow-up recommendations
- [ ] Edit interaction functionality
- [ ] Form prefill from chat
- [ ] Database persistence

## 📊 Project Structure

```
crm-ai-hcp/
├── backend/
│   ├── app/
│   │   ├── agents/          # LangGraph agent implementation
│   │   │   ├── graph.py     # Agent workflow
│   │   │   ├── nodes.py     # Agent nodes (extract, route, execute)
│   │   │   ├── state.py     # Agent state definition
│   │   │   └── tools.py     # LangGraph tools
│   │   ├── api/             # FastAPI endpoints
│   │   │   ├── agent.py     # AI chat endpoints
│   │   │   ├── hcp.py       # HCP CRUD endpoints
│   │   │   └── interaction.py # Interaction CRUD endpoints
│   │   ├── database/        # Database configuration
│   │   │   ├── db.py        # Database session
│   │   │   └── models.py    # SQLAlchemy models
│   │   ├── services/        # Business logic
│   │   │   ├── hcp.py       # HCP service
│   │   │   ├── interaction.py # Interaction service
│   │   │   └── llm.py       # LLM service
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── config.py        # Configuration
│   │   └── main.py          # FastAPI app
│   ├── alembic/             # Database migrations
│   ├── requirements.txt     # Python dependencies
│   └── alembic.ini          # Alembic configuration
├── frontend/
│   ├── src/
│   │   ├── api/             # API client
│   │   ├── app/             # Redux store
│   │   ├── components/      # React components
│   │   │   ├── ChatBox.jsx          # AI chat interface
│   │   │   ├── InteractionForm.jsx  # Structured form
│   │   │   ├── HCPPanel.jsx         # HCP information panel
│   │   │   ├── InteractionHistory.jsx # History display
│   │   │   └── ...
│   │   ├── features/        # Redux slices
│   │   │   ├── hcpSlice.js          # HCP state management
│   │   │   └── interactionSlice.js  # Interaction state management
│   │   ├── pages/           # Page components
│   │   └── main.jsx         # React entry point
│   ├── package.json         # Node dependencies
│   └── vite.config.js       # Vite configuration
└── README.md                # This file
```

## 🚧 Future Enhancements

- [ ] User authentication and authorization
- [ ] Advanced analytics dashboard
- [ ] Email integration for follow-ups
- [ ] Calendar integration
- [ ] File upload for materials
- [ ] Advanced search filters
- [ ] Export functionality
- [ ] Mobile app development
- [ ] Multi-language support
- [ ] Advanced sentiment analysis
- [ ] Predictive analytics

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is part of an assignment submission. Please contact the repository owner for usage permissions.

## 📧 Support

For questions or issues, please open an issue in the repository or contact the development team.

## 🎯 Assignment Context

This project was developed as part of a technical assignment for an AI-first CRM system. It demonstrates:

- Integration of LangGraph with FastAPI
- AI-powered entity extraction and routing
- Dual interface design (form + chat)
- Modern React architecture with Redux
- Production-ready API design
- Comprehensive error handling
- Optimistic UI updates

### Assignment Requirements Met
- ✅ LangGraph AI Agent with 5 tools
- ✅ Log Interaction and Edit Interaction tools (required)
- ✅ React UI with Redux state management
- ✅ FastAPI backend with Python
- ✅ Groq LLM integration
- ✅ PostgreSQL database
- ✅ Google Inter font
- ✅ Dual interface (form + chat)
- ✅ Entity extraction and sentiment analysis
- ✅ Follow-up recommendations

---

**Built with ❤️ using modern web technologies and AI-powered insights**
